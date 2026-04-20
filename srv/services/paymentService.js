const cfg = require('../../config');
const { ValidationError } = require('../utils/errorHandler');

function genInvoiceNumber(year, seq) {
  return `${cfg.INVOICE_PREFIX}-${year}-${String(seq).padStart(4,'0')}`;
}
function genReceiptNumber() {
  return `${cfg.RECEIPT_PREFIX}-${Date.now().toString().slice(-8)}`;
}
function calcLateFee(dueDate) {
  const today = new Date(), due = new Date(dueDate);
  if (due >= today) return 0;
  const days = Math.floor((today - due) / 86400000);
  return Math.min(days * cfg.LATE_FEE_PER_DAY, cfg.LATE_FEE_MAX);
}
function deriveStatus(dueDate, isPaid) {
  if (isPaid) return 'Paid';
  return new Date() > new Date(dueDate) ? 'Overdue' : 'Pending';
}
function validate(data) {
  if (!data.student_ID)           throw new ValidationError('Student reference required');
  if (!data.amount || data.amount <= 0) throw new ValidationError('Amount must be positive');
  if (!data.dueDate)              throw new ValidationError('Due date required');
  if (!data.type?.trim())         throw new ValidationError('Payment type required');
}
function buildInvoice(student, room, month, year, seq) {
  return {
    invoiceNumber: genInvoiceNumber(year, seq),
    student_ID:    student.ID,
    type:          'RoomRent',
    amount:        room.monthlyRent,
    dueDate:       `${year}-${String(month).padStart(2,'0')}-05`,
    status:        'Pending',
    lateFeeApplied: 0,
  };
}

module.exports = { genInvoiceNumber, genReceiptNumber, calcLateFee, deriveStatus, validate, buildInvoice };
