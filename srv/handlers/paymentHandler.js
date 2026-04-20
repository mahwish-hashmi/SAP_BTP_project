const log  = require('../utils/logger');
const { wrap } = require('../utils/errorHandler');
const paySvc   = require('../services/paymentService');

module.exports = (srv) => {
  const { Payments, Students } = srv.entities;

  srv.before('CREATE', Payments, wrap('PaymentHandler', async function(req) {
    paySvc.validate(req.data);
    const { cnt } = await SELECT.one`count(*) as cnt`.from(Payments);
    req.data.invoiceNumber  = paySvc.genInvoiceNumber(new Date().getFullYear(), 1+(cnt||0));
    req.data.lateFeeApplied = paySvc.calcLateFee(req.data.dueDate);
    req.data.status         = paySvc.deriveStatus(req.data.dueDate, req.data.status === 'Paid');
    if (req.data.lateFeeApplied > 0)
      log.warn('PaymentHandler', `Late fee ₹${req.data.lateFeeApplied} on ${req.data.invoiceNumber}`);
    log.info('PaymentHandler', `Invoice: ${req.data.invoiceNumber} ₹${req.data.amount}`);
  }));

  srv.after('UPDATE', Payments, async (data, req) => {
    if (req.data.status !== 'Paid') return;
    try {
      const receipt = paySvc.genReceiptNumber();
      await UPDATE(Payments)
        .set({ receiptNumber: receipt, paidDate: new Date().toISOString().split('T')[0] })
        .where({ ID: data.ID });
      const { cnt } = await SELECT.one`count(*) as cnt`
        .from(Payments).where({ student_ID: data.student_ID, status: { '!=': 'Paid' } });
      await UPDATE(Students)
        .set({ feeStatus: (cnt||0) > 0 ? 'Pending' : 'Paid' })
        .where({ ID: data.student_ID });
      log.audit('PaymentHandler', `Payment confirmed: receipt ${receipt}`);
    } catch(e) { log.error('PaymentHandler', 'Post-payment sync failed', { error: e }); }
  });
};
