// Structured JSON logging (pretty-printed in development).
const pino = require("pino");

const isDev = (process.env.NODE_ENV || "development") === "development";
const isTest = process.env.NODE_ENV === "test";

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : isDev ? "debug" : "info"),
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "*.password", "*.apiKey"],
    remove: true,
  },
  transport:
    isDev && !isTest
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        }
      : undefined,
});

module.exports = logger;
