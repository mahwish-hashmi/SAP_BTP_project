const log = require('../utils/logger');
const sla = require('../utils/slaEngine');

module.exports.run = async (db) => {
  log.info('SLAJob', 'SLA scan started');
  try {
    const complaints = await db.run(
      SELECT.from('smarthostel.Complaints').where({ status: { in: ['Open','InProgress','SLAWarning'] } })
    );
    if (!complaints.length) return { scanned:0, breached:0, warnings:0 };
    const { breached, warning } = sla.scanForBreaches(complaints);
    let b=0, w=0;
    for (const c of breached) {
      const esc = sla.getEscalationLevel(parseFloat(c.overdueHours));
      await db.run(UPDATE('smarthostel.Complaints').set({ status:'SLABreached', assignedTo: esc.notifyTo }).where({ ID: c.ID }));
      log.audit('SLAJob', `BREACH: ${c.complaintID} — ${c.overdueHours}h overdue → L${esc.level}`); b++;
    }
    for (const c of warning) {
      await db.run(UPDATE('smarthostel.Complaints').set({ status:'SLAWarning' }).where({ ID: c.ID, status: {'!=':'SLABreached'} }));
      w++;
    }
    log.info('SLAJob', `Scan complete: ${b} breached, ${w} warnings`);
    return { scanned: complaints.length, breached: b, warnings: w };
  } catch(e) { log.error('SLAJob', 'Failed', { error: e }); return { error: e.message }; }
};
