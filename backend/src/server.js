// Process entrypoint: HTTP server + in-process ingestion runner, with graceful shutdown.
const config = require("./config");
const logger = require("./lib/logger");
const prisma = require("./prisma/client");
const { createApp } = require("./app");
const { runner } = require("./jobs/runner");

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(`Zenoryx API listening on :${config.port} [${config.env}]`);
  runner.recover().catch((err) => logger.error({ err: err.message }, "[runner] recovery failed"));
});
// SSE answers can be long-lived; don't let Node cut them off.
server.requestTimeout = 0;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 61_000;

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);
  const force = setTimeout(() => process.exit(1), 15_000);
  force.unref();
  server.close();
  await runner.stop(); // in-flight jobs are returned to PENDING and resume on next boot
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandledRejection"));
