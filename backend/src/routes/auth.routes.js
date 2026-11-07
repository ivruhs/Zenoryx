const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const auth = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.guard");

const router = express.Router();

// Brute-force protection: failed attempts only, 15 per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  skipSuccessfulRequests: true,
  // Key by account when an email is given: shared egress IPs (proxies, NAT) can't
  // lock everyone out, and brute force against one account is still capped.
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip)}`;
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

router.post("/register", authLimiter, auth.register);
router.post("/login", authLimiter, auth.login);
router.post("/logout", auth.logout);
router.get("/me", protect, auth.me);
router.get("/session", auth.session);

module.exports = router;
