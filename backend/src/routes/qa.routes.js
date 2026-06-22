// src/routes/qa.routes.js

const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.guard");
const qaController = require("../controllers/qa.controller");

const router = express.Router();

// Strict rate limiter: Max 20 questions per hour per IP
const qaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error:
      "You have exceeded the limit of 20 questions per hour. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /qa -> Streams RAG response back to client
router.post("/", protect, qaLimiter, qaController.handleQuestion);

module.exports = router;
