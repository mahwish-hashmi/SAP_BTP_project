const cfg = require('../../config');
const log = require('../utils/logger');
const { ValidationError, ConflictError } = require('../utils/errorHandler');
const W = cfg.ALLOC_SCORE;

function scoreRoom(room, prefs={}) {
  let s = W.BASE;
  if (prefs.roomType  && room.type  === prefs.roomType)  s += W.TYPE_MATCH;
  if (prefs.floorPref && room.floor === prefs.floorPref) s += W.FLOOR_MATCH;
  if (prefs.blockPref && room.block === prefs.blockPref) s += W.BLOCK_MATCH;
  if (prefs.acRequired && room.isACRoom)                 s += W.AC_MATCH;
  s += Math.floor((1 - (room.occupied / Math.max(room.capacity,1))) * W.VACANCY);
  return Math.min(s, 100);
}

function allocate(vacantRooms, prefs={}) {
  if (!vacantRooms?.length) throw new ValidationError('No vacant rooms available.');
  const ranked = vacantRooms
    .filter(r => r.status === 'Vacant')
    .map(r => ({ ...r, matchScore: scoreRoom(r, prefs) }))
    .sort((a,b) => b.matchScore - a.matchScore);
  if (!ranked.length) throw new ValidationError('No eligible rooms for given preferences.');
  log.info('RoomService', `Best: ${ranked[0].roomNumber} (${ranked[0].matchScore}%)`);
  return ranked[0];
}

function computeOccupancyRate(rooms) {
  const total = rooms.reduce((s,r)=>s+r.capacity,0);
  const occ   = rooms.reduce((s,r)=>s+r.occupied,0);
  return total ? parseFloat(((occ/total)*100).toFixed(1)) : 0;
}

function assertNotAssigned(student) {
  if (student?.room_ID) throw new ConflictError(`Student ${student.studentID} already has a room.`);
}

module.exports = { scoreRoom, allocate, computeOccupancyRate, assertNotAssigned };
