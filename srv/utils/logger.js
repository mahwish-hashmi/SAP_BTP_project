const cfg = require('../../config');
const LEVELS = { DEBUG:0, INFO:1, WARN:2, ERROR:3, AUDIT:4 };
const cur = LEVELS[cfg.LOG_LEVEL] ?? 1;
let _cid = '-';

function fmt(level, mod, msg, meta={}) {
  return { timestamp: new Date().toISOString(), level, module: mod, message: msg,
    correlationId: meta.correlationId || _cid, user: meta.user || 'system',
    ...(meta.data  ? { data:  meta.data  } : {}),
    ...(meta.error ? { error: { message: meta.error.message } } : {}),
  };
}
function emit(level, num, mod, msg, meta) {
  if (num < cur) return null;
  const e = fmt(level, mod, msg, meta);
  const fn = num >= LEVELS.ERROR ? console.error : num >= LEVELS.WARN ? console.warn : console.info;
  fn(JSON.stringify(e));
  return e;
}

const log = {
  debug: (m,msg,x) => emit('DEBUG',0,m,msg,x),
  info:  (m,msg,x) => emit('INFO', 1,m,msg,x),
  warn:  (m,msg,x) => emit('WARN', 2,m,msg,x),
  error: (m,msg,x) => emit('ERROR',3,m,msg,x),
  audit: (m,msg,x) => { const e=fmt('AUDIT',m,msg,x); console.info(JSON.stringify(e)); return e; },
  setCorrelationId: id => { _cid = id; },
  middleware: (req,_,next) => {
    _cid = req.headers['x-correlationid'] || req.headers['x-request-id'] || require('crypto').randomUUID();
    next();
  },
};
module.exports = log;
