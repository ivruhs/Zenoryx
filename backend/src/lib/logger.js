// console.log on steroids, i.e. a structured logger that outputs JSON instead of plain text

const pino = require("pino");

const logger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

module.exports = logger;

// this is a simple console.log file on steroids. basically we are using pino which is a structured logger. instead of plain txt, it logs pure JSON, which is much easier to parse and analyze. in development mode, we use pino-pretty to make the logs more human readable with colors and timestamps. in production, we just log plain JSON for better performance and easier integration with log management systems.
