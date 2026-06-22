const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const config = require("./config");
const logger = require("./lib/logger");
const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/projects.routes");
const qaRoutes = require("./routes/qa.routes");
const { protect } = require("./middleware/auth.guard");
const helmet = require("helmet");

const app = express();
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({ status: "ok", timestamp: new Date().toISOString() });
});

// global error handler middleware

app.use((err, req, res, next) => {
  logger.error(err, "Unhandled exception encountered");
  return res.status(500).json({
    error: "Internal Server Error",
    message:
      config.env === "development"
        ? err.message
        : "an unexpected error occurred",
  });
});

app.use("/auth", authRoutes);

app.get("/auth/me", protect, (req, res) => {
  return res
    .status(200)
    .json({ message: "You are authenticated!", user: req.user });
});

app.use("/projects", projectRoutes);
app.use("/qa", qaRoutes);

app.listen(config.port, () => {
  logger.info(
    `zenoryx backend engine is live on port ${config.port} [${config.env}]`,
  );
});
