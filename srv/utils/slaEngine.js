const cfg = require('../../config');

function getRule(cat)         { return cfg.COMPLAINT_RULES[cat] || cfg.COMPLAINT_RULES['Other']; }
function getSLAHours(cat)     { return cfg.SLA[getRule(cat).slaKey]; }
function calcDeadline(createdAt, cat) {
  const d = new Date(createdAt); d.setHours(d.getHours() + getSLAHours(cat)); return d;
}
function isSLABreached(c) {
  if (['Resolved','Closed'].includes(c.status)) return false;
  return new Date() > calcDeadline(c.createdAt || new Date(), c.category);
}
function getSLAStatus(c) {
  const dl = calcDeadline(c.createdAt || new Date(), c.category);
  const diff = dl - new Date();
  const h = Math.floor(Math.abs(diff)/3600000);
  const m = Math.floor((Math.abs(diff)%3600000)/60000);
  return diff > 0 ? `${h}h ${m}m remaining` : `BREACHED ${h}h ${m}m ago`;
}
function getEscalationLevel(overdueH) {
  if (overdueH >= 24) return { level:3, notifyTo:'Director',      action:'ESCALATE_L3' };
  if (overdueH >= 8)  return { level:2, notifyTo:'Hostel Warden', action:'ESCALATE_L2' };
  return               { level:1, notifyTo:'Floor Incharge', action:'ESCALATE_L1' };
}
function scanForBreaches(complaints) {
  const now = new Date(), res = { breached:[], warning:[], ok:[] };
  for (const c of complaints) {
    if (['Resolved','Closed'].includes(c.status)) continue;
    const dl = calcDeadline(c.createdAt || now, c.category);
    const dH = (dl - now) / 3600000;
    if (dH < 0)  res.breached.push({ ...c, overdueHours: Math.abs(dH).toFixed(1) });
    else if (dH < 2) res.warning.push({ ...c, remainingHours: dH.toFixed(1) });
    else res.ok.push(c);
  }
  return res;
}

module.exports = { getRule, getSLAHours, calcDeadline, isSLABreached, getSLAStatus, getEscalationLevel, scanForBreaches };
