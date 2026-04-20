const log    = require('../utils/logger');
const paySvc = require('../services/paymentService');

module.exports.run = async (db, month, year) => {
  const now = new Date();
  month = month || (now.getMonth()+1);
  year  = year  || now.getFullYear();
  log.info('InvoiceJob', `Monthly invoice job: ${month}/${year}`);
  try {
    const students = await db.run(SELECT.from('smarthostel.Students').where({ status:'Active' }));
    let created=0, skipped=0, total=0;
    const { cnt } = await db.run(SELECT.one`count(*) as cnt`.from('smarthostel.Payments'));
    let seq = 1 + (cnt||0);
    for (const s of students) {
      if (!s.room_ID) { skipped++; continue; }
      const room = await db.run(SELECT.one.from('smarthostel.Rooms').where({ ID: s.room_ID }));
      if (!room) { skipped++; continue; }
      const dueDate = `${year}-${String(month).padStart(2,'0')}-05`;
      const exists  = await db.run(SELECT.one.from('smarthostel.Payments').where({ student_ID: s.ID, dueDate, type:'RoomRent' }));
      if (exists) { skipped++; continue; }
      const inv = paySvc.buildInvoice(s, room, month, year, seq++);
      await db.run(INSERT.into('smarthostel.Payments').entries(inv));
      total += parseFloat(room.monthlyRent); created++;
    }
    log.audit('InvoiceJob', `Done: ${created} created ₹${total}, ${skipped} skipped`);
    return { invoicesCreated: created, totalAmount: total, skipped };
  } catch(e) { log.error('InvoiceJob','Failed',{error:e}); return { error: e.message }; }
};
