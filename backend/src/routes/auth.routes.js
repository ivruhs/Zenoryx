/*
src/routes/auth.routes.js: The API gateway. It maps the /register, /login, and /logout endpoints to their controller functions and applies a strict IP rate-limiter to prevent brute-force attacks.

*/

const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");

const router = express.Router();

// Rate limiter: Max 5 login/register attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authController.logout);

module.exports = router;
