const log       = require('../utils/logger');
const sla       = require('../utils/slaEngine');
const { wrap, assert, ValidationError } = require('../utils/errorHandler');

module.exports = (srv) => {
  const { Complaints } = srv.entities;

  srv.before('CREATE', Complaints, wrap('ComplaintHandler', async function(req) {
    assert(req.data.category?.trim(), 'Category is required');
    const { cnt } = await SELECT.one`count(*) as cnt`.from(Complaints);
    req.data.complaintID = `CMP-${String(1+(cnt||0)).padStart(4,'0')}`;
    const rule = sla.getRule(req.data.category);
    req.data.priority   = rule.priority;
    req.data.assignedTo = rule.assignTo;
    req.data.status     = 'Open';
    log.warn('ComplaintHandler',
      `New ${rule.priority} complaint ${req.data.complaintID}: ${req.data.category}`,
      { user: req.user?.id, data: { slaHours: sla.getSLAHours(req.data.category) } });
  }));

  srv.before('UPDATE', Complaints, wrap('ComplaintHandler', async function(req) {
    if (req.data.status === 'Resolved') {
      if (!req.data.resolutionNote?.trim())
        throw new ValidationError('Resolution note is required to close a complaint.');
      req.data.resolvedDate = new Date().toISOString();
      log.audit('ComplaintHandler', `Resolved: ${req.params[0]?.ID}`, { user: req.user?.id });
    }
  }));

  srv.after('READ', Complaints, (results) => {
    const list = Array.isArray(results) ? results : [results];
    list.forEach(c => {
      if (!c?.category || ['Resolved','Closed'].includes(c.status)) return;
      c.slaStatus = sla.getSLAStatus(c);
      c.slaBreach = sla.isSLABreached(c);
    });
  });
};
