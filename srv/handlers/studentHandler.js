const log = require('../utils/logger');
const { wrap, assert, ConflictError } = require('../utils/errorHandler');
const cfg = require('../../config');

module.exports = (srv) => {
  const { Students, Rooms } = srv.entities;

  srv.before('CREATE', Students, wrap('StudentHandler', async function(req) {
    const d = req.data;
    assert(d.name?.trim(),  'Name is required');
    assert(d.email?.trim(), 'Email is required');
    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), 'Invalid email format');
    assert(d.course?.trim(), 'Course is required');
    assert(d.year >= 1 && d.year <= 6, 'Year must be 1–6');

    const dup = await SELECT.one(Students).where({ email: d.email });
    if (dup) throw new ConflictError(`Email ${d.email} already registered.`);

    const { cnt } = await SELECT.one`count(*) as cnt`.from(Students);
    req.data.studentID   = `${cfg.STUDENT_ID_PREFIX}-${cfg.STUDENT_ID_START + (cnt||0)}`;
    req.data.joiningDate = d.joiningDate || new Date().toISOString().split('T')[0];
    req.data.status      = 'Active';
    req.data.feeStatus   = 'Pending';

    log.audit('StudentHandler', `Onboard: ${req.data.studentID} — ${d.name}`, { user: req.user?.id });
  }));

  srv.before('UPDATE', Students, wrap('StudentHandler', async function(req) {
    if (req.data.studentID) delete req.data.studentID;
    if (req.data.status === 'Checked-Out') {
      req.data.exitDate = new Date().toISOString().split('T')[0];
      log.audit('StudentHandler', `Checkout: ID=${req.params[0]?.ID}`, { user: req.user?.id });
    }
  }));

  srv.after('UPDATE', Students, async (data, req) => {
    if (!req.data.room_ID) return;
    try {
      const room = await SELECT.one(Rooms).where({ ID: req.data.room_ID });
      if (!room) return;
      const { cnt } = await SELECT.one`count(*) as cnt`
        .from(Students).where({ room_ID: req.data.room_ID, status: 'Active' });
      const occ = cnt || 0;
      await UPDATE(Rooms)
        .set({ occupied: occ, status: occ >= room.capacity ? 'Occupied' : 'Vacant' })
        .where({ ID: req.data.room_ID });
      log.info('StudentHandler', `Room ${room.roomNumber} occupancy synced: ${occ}/${room.capacity}`);
    } catch(e) { log.error('StudentHandler', 'Room sync failed', { error: e }); }
  });

  srv.before('DELETE', Students, wrap('StudentHandler', async function(req) {
    const s = await SELECT.one(Students).where({ ID: req.params[0]?.ID });
    if (s?.status === 'Active') throw new ConflictError(
      `Cannot delete active student ${s.studentID}. Use checkout first.`
    );
  }));
};
