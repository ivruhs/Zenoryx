const express = require("express");
const rateLimit = require("express-rate-limit");
const config = require("../config");
const { protect } = require("../middleware/auth.guard");
const qa = require("../controllers/qa.controller");

const router = express.Router();

// Per-user (not per-IP) so users behind one NAT/proxy don't share a budget.
const qaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.qa.perHourLimit,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: `You've reached ${config.qa.perHourLimit} questions this hour. Please try again later.` },
});

router.post("/", protect, qaLimiter, qa.ask);

module.exports = router;
