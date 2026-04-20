const log = require('./logger');

class ValidationError extends Error { constructor(m){super(m);this.statusCode=400;} }
class NotFoundError   extends Error { constructor(e,id){super(`${e} '${id}' not found`);this.statusCode=404;} }
class ConflictError   extends Error { constructor(m){super(m);this.statusCode=409;} }

function wrap(mod, fn) {
  return async function(req) {
    try { return await fn.call(this, req); }
    catch(err) {
      log.error(mod, err.message, { error: err, user: req.user?.id, data: req.data });
      return req.error(err.statusCode || 500, err.message);
    }
  };
}
function assert(cond, msg)      { if (!cond) throw new ValidationError(msg); }
function assertExists(e, id, v) { if (!v)    throw new NotFoundError(e, id); }

module.exports = { wrap, assert, assertExists, ValidationError, NotFoundError, ConflictError };
