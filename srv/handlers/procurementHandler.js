const log  = require('../utils/logger');
const { wrap, ValidationError } = require('../utils/errorHandler');
const cfg  = require('../../config');

module.exports = (srv) => {
  const { PurchaseOrders } = srv.entities;

  srv.before('CREATE', PurchaseOrders, wrap('ProcurementHandler', async function(req) {
    if (!req.data.itemDesc?.trim()) throw new ValidationError('Item description required');
    if (!req.data.quantity || req.data.quantity <= 0) throw new ValidationError('Quantity must be positive');
    if (!req.data.unitPrice || req.data.unitPrice <= 0) throw new ValidationError('Unit price must be positive');
    const { cnt } = await SELECT.one`count(*) as cnt`.from(PurchaseOrders);
    const year = new Date().getFullYear();
    req.data.poNumber     = `${cfg.PO_PREFIX}-${year}-${String(cfg.PO_ID_START || 1001 + (cnt||0)).padStart(4,'0')}`;
    req.data.totalAmount  = parseFloat((req.data.quantity * req.data.unitPrice).toFixed(2));
    req.data.status       = 'Draft';
    req.data.threeWayMatch = false;
    log.info('ProcurementHandler', `PO ${req.data.poNumber} created ₹${req.data.totalAmount}`);
  }));

  srv.before('UPDATE', PurchaseOrders, wrap('ProcurementHandler', async function(req) {
    if (req.data.grnNumber && req.data.invoiceRef) {
      req.data.threeWayMatch = true;
      req.data.status = 'Delivered';
      log.audit('ProcurementHandler', `3-Way Match complete: ${req.data.poNumber || req.params[0]?.ID}`);
    }
  }));
};
