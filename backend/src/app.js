// Express application (no side effects — server.js starts it; tests import it).
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { runner } = require("./jobs/runner");
const { notFound, errorHandler } = require("./middleware/errors");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Behind Render/Vercel proxies: trust the first hop so rate limits see real client IPs.
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin.replace(/\/$/, ""))),
      credentials: true,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Liveness only — deliberately does NOT touch the database, so platform health
  // checks don't keep the (free, auto-suspending) Neon compute awake.
  const health = (req, res) =>
    res.json({ status: "ok", uptime: Math.round(process.uptime()), jobs: runner.stats(), time: new Date().toISOString() });
  app.get("/health", health);
  app.get("/api/health", health);

  const api = express.Router();
  api.use("/auth", require("./routes/auth.routes"));
  api.use("/projects", require("./routes/projects.routes"));
  api.use("/qa", require("./routes/qa.routes"));

  // Served under /api (proxied, same-origin) and at the root (backwards compatible).
  app.use("/api", api);
  app.use("/", api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
