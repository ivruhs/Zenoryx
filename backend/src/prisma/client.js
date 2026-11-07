// Single shared PrismaClient, connected through node-postgres (driver adapter).
//
// Why the adapter instead of Prisma's built-in Rust connector:
//  * Node's socket layer does "happy eyeballs" (IPv6 → IPv4 fallback). The Rust
//    engine does not, so on networks with broken IPv6 it fails with P1001 even
//    though the database is reachable.
//  * Neon's free tier scales compute to zero when idle; the first connection can
//    take several seconds. We allow a generous connect timeout and keep idle
//    connections short-lived so Neon can suspend (saving free compute hours).
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const config = require("../config");
const logger = require("../lib/logger");

function poolConfig(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");
  // Handle TLS explicitly (pg's parsing of libpq ssl params is changing).
  ["sslmode", "channel_binding", "connect_timeout", "pool_timeout", "pgbouncer", "schema"].forEach((k) => url.searchParams.delete(k));
  const ssl = sslmode && sslmode !== "disable" ? { rejectUnauthorized: sslmode !== "no-verify" } : undefined;
  return {
    connectionString: url.toString(),
    ssl,
    max: 5,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  };
}

const adapter = new PrismaPg(poolConfig(config.databaseUrl));

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

if (process.env.LOG_QUERIES === "true") {
  prisma.$on("query", (e) => logger.debug({ duration: `${e.duration}ms` }, e.query));
}
prisma.$on("warn", (e) => logger.warn(e.message));
prisma.$on("error", (e) => logger.error(e.message));

module.exports = prisma;
