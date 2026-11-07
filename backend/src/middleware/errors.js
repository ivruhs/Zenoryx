// 404 + central error handler. Must be registered AFTER all routes
// (the previous version registered it first, so it never ran).
const config = require("../config");
const logger = require("../lib/logger");

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    logger.error({ err }, "error after headers were sent");
    return res.end();
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found." });
  }
  const status = Number(err.status || err.statusCode) || 500;
  if (status < 500 || err.expose) {
    return res.status(status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
  }
  logger.error({ err, path: req.path }, "unhandled error");
  return res.status(500).json({
    error: "Internal server error.",
    ...(config.isProd ? {} : { detail: err.message }),
  });
}

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

module.exports = { notFound, errorHandler, HttpError };
