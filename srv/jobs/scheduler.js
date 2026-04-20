const log     = require('../utils/logger');
const cfg     = require('../../config');
const slaJob  = require('./slaJob');
const invJob  = require('./invoiceJob');

let _db = null;

async function start(db) {
  _db = db;
  let cron;
  try { cron = require('node-cron'); }
  catch { log.warn('Scheduler','node-cron not installed. Run: npm install node-cron'); return; }

  log.info('Scheduler','Starting all jobs', { data: cfg.JOBS });

  cron.schedule(cfg.JOBS.SLA_CHECK, async () => {
    const r = await slaJob.run(_db);
    if (r.breached > 0) log.warn('Scheduler',`${r.breached} SLA breaches escalated`);
  });

  cron.schedule(cfg.JOBS.MONTHLY_INVOICES, async () => {
    const r = await invJob.run(_db);
    log.audit('Scheduler',`Invoice job: ${r.invoicesCreated} created ₹${r.totalAmount}`);
  });

  cron.schedule(cfg.JOBS.FEE_REMINDER, async () => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()+3);
    const due = await _db.run(
      SELECT.from('smarthostel.Payments')
        .where({ status:'Pending' })
        .and`dueDate <= ${cutoff.toISOString().split('T')[0]}`
    );
    if (due.length) log.warn('Scheduler',`Fee reminder: ${due.length} invoices due in 3 days`);
  });

  log.info('Scheduler','✓ All jobs running');
}

async function triggerManual(jobName) {
  if (!_db) return { error:'Scheduler not initialised' };
  log.audit('Scheduler',`Manual trigger: ${jobName}`);
  if (jobName === 'sla')     return slaJob.run(_db);
  if (jobName === 'invoices') return invJob.run(_db);
  return { error: `Unknown job: ${jobName}` };
}

module.exports = { start, triggerManual };
