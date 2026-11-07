const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.guard");
const projects = require("../controllers/projects.controller");

const router = express.Router();
router.use(protect);

// Validation/creation hit the GitHub API; keep a lid on it per user.
const githubLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many repository lookups this hour. Please try again later." },
});

router.get("/", projects.list);
router.post("/", githubLimiter, projects.create);
router.post("/validate", githubLimiter, projects.validate);
router.get("/:id", projects.get);
router.delete("/:id", projects.remove);
router.get("/:id/status", projects.status);
router.post("/:id/retry", projects.retry);
router.get("/:id/commits", projects.commits);
router.get("/:id/files", projects.files);
router.get("/:id/chunks", projects.fileChunks);
router.get("/:id/messages", projects.messages);
router.delete("/:id/messages", projects.clearMessages);

module.exports = router;
