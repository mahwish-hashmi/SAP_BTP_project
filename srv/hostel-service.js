// ═══════════════════════════════════════════════════════
//  SmartHostel BTP — Main CAP Service
//  Wires: handlers + services + jobs + actions + functions
//  Run: cds watch  →  http://localhost:4004
// ═══════════════════════════════════════════════════════

const cds         = require('@sap/cds');
const log         = require('./utils/logger');
const { wrap }    = require('./utils/errorHandler');
const roomSvc     = require('./services/roomService');
const paySvc      = require('./services/paymentService');
const analyticsSvc= require('./services/analyticsService');
const slaEngine   = require('./utils/slaEngine');
const scheduler   = require('./jobs/scheduler');

const studentHandler     = require('./handlers/studentHandler');
const paymentHandler     = require('./handlers/paymentHandler');
const complaintHandler   = require('./handlers/complaintHandler');
const procurementHandler = require('./handlers/procurementHandler');

module.exports = class HostelService extends cds.ApplicationService {

  async init() {
    const { Rooms, Students, Payments, Complaints, PurchaseOrders } = this.entities;

    // ── Register all entity handlers ────────────────
    studentHandler(this);
    paymentHandler(this);
    complaintHandler(this);
    procurementHandler(this);

    // ── ACTION: allocateRoom ─────────────────────────
    this.on('allocateRoom', wrap('HostelService', async (req) => {
      const { studentID, roomType, floorPref, blockPref, acRequired } = req.data;

      const student = await SELECT.one(Students).where({ studentID });
      if (!student) return req.error(404, `Student ${studentID} not found`);

      const vacantRooms = await SELECT(Rooms).where({ status: 'Vacant' });
      const best = roomSvc.allocate(vacantRooms, {
        roomType, floorPref: parseInt(floorPref)||0, blockPref, acRequired
      });

      log.audit('HostelService', `allocateRoom: ${best.roomNumber} → ${studentID} (${best.matchScore}%)`,
        { user: req.user?.id });

      return {
        roomNumber:  best.roomNumber,
        block:       best.block,
        type:        best.type,
        matchScore:  best.matchScore,
        monthlyRent: best.monthlyRent,
        roomID:      best.ID,
      };
    }));

    // ── ACTION: classifyComplaintPriority ────────────
    this.on('classifyComplaintPriority', (req) => {
      const rule = slaEngine.getRule(req.data.category);
      const cfg  = require('../config');
      return { priority: rule.priority, slaHours: cfg.SLA[rule.slaKey], assignTo: rule.assignTo };
    });

    // ── ACTION: generateMonthlyInvoices ─────────────
    this.on('generateMonthlyInvoices', wrap('HostelService', async (req) => {
      const db = await cds.connect.to('db');
      return require('./jobs/invoiceJob').run(db, req.data.month, req.data.year);
    }));

    // ── ACTION: markPaymentPaid ──────────────────────
    this.on('markPaymentPaid', wrap('HostelService', async (req) => {
      const { paymentID, paymentMode, transactionRef } = req.data;
      const payment = await SELECT.one(Payments).where({ ID: paymentID });
      if (!payment) return req.error(404, `Payment ${paymentID} not found`);
      if (payment.status === 'Paid') return req.error(409, 'Payment already marked as paid');

      const receipt = paySvc.genReceiptNumber();
      const today   = new Date().toISOString().split('T')[0];

      await UPDATE(Payments)
        .set({ status:'Paid', paidDate: today, receiptNumber: receipt, paymentMode, transactionRef })
        .where({ ID: paymentID });

      // Sync student feeStatus
      const { cnt } = await SELECT.one`count(*) as cnt`
        .from(Payments).where({ student_ID: payment.student_ID, status: { '!=': 'Paid' } });
      await UPDATE(Students).set({ feeStatus: (cnt||0) > 0 ? 'Pending' : 'Paid' })
        .where({ ID: payment.student_ID });

      log.audit('HostelService', `Payment marked paid: ${payment.invoiceNumber} → ${receipt}`,
        { user: req.user?.id });
      return { receiptNumber: receipt, status: 'Paid' };
    }));

    // ── ACTION: triggerJob ───────────────────────────
    this.on('triggerJob', wrap('HostelService', async (req) => {
      const result = await scheduler.triggerManual(req.data.jobName);
      return { result: 'ok', details: JSON.stringify(result) };
    }));

    // ── FUNCTION: getDashboardKPIs ───────────────────
    this.on('getDashboardKPIs', wrap('HostelService', async () => {
      const [students, rooms, payments, complaints] = await Promise.all([
        SELECT(Students), SELECT(Rooms), SELECT(Payments), SELECT(Complaints)
      ]);
      return analyticsSvc.buildKPIs({ students, rooms, payments, complaints });
    }));

    // ── FUNCTION: getMonthlyReport ───────────────────
    this.on('getMonthlyReport', wrap('HostelService', async (req) => {
      const payments = await SELECT(Payments);
      return analyticsSvc.buildMonthlyReport({
        payments, month: req.data.month, year: req.data.year
      });
    }));

    // ── FUNCTION: getRevenueTrend ────────────────────
    this.on('getRevenueTrend', wrap('HostelService', async () => {
      const payments = await SELECT(Payments);
      return analyticsSvc.buildRevenueTrend(payments);
    }));

    // ── FUNCTION: getComplaintStats ──────────────────
    this.on('getComplaintStats', wrap('HostelService', async () => {
      const complaints = await SELECT(Complaints);
      const open    = complaints.filter(c => ['Open','InProgress'].includes(c.status)).length;
      const breached= complaints.filter(c => c.status === 'SLABreached').length;
      const resolved= complaints.filter(c => c.status === 'Resolved');
      const avgH    = resolved.length
        ? parseFloat((resolved.reduce((s,c) => {
            return s + (new Date(c.resolvedDate||Date.now()) - new Date(c.createdAt||Date.now()));
          }, 0) / resolved.length / 3600000).toFixed(1))
        : 0;
      return { total: complaints.length, openCount: open, breachedCount: breached, avgResolutionHours: avgH };
    }));

    await super.init();

    // ── Start scheduler after CAP is fully up ────────
    cds.once('served', async () => {
      try {
        const db = await cds.connect.to('db');
        await scheduler.start(db);
        log.info('HostelService', `✓ Service ready — ${Object.keys(this.entities).length} entities`);
      } catch(e) {
        log.warn('HostelService', 'Scheduler start failed (non-fatal)', { error: e });
      }
    });
  }
};
