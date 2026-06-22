const { PrismaClient } = require("@prisma/client");
const logger = require("../lib/logger");

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "info" },
    { emit: "stdout", level: "warn" },
    { emit: "stdout", level: "error" },
  ],
});

if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug(
      { query: e.query, duration: `${e.duration}ms` },
      "Prisma Query",
    );
  });
}

module.exports = prisma;

// using new PrismClient() directly in multiples files can open dozens of connections which is not good. so to avoid that, we create a single instance of PrismaClient and export it, so that all files can use the same instance and connection pool.
// we are logging all queries in development mode for debugging purposes, but in production we only log warnings and errors to avoid performance issues.
