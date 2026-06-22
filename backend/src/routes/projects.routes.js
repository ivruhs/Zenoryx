// src/routes/projects.routes.js

const express = require("express");
const { protect } = require("../middleware/auth.guard");
const ingestionController = require("../controllers/ingestion.controller");

const router = express.Router();

// POST /projects -> triggers the ingestion pipeline
router.post("/", protect, ingestionController.triggerIngestion);

// GET /projects/:id/status -> get the status of a project
router.get("/:id/status", protect, ingestionController.getStatus);

// DELETE /projects/:id -> Deletes project, chunks, and queue jobs
router.delete("/:id", protect, ingestionController.deleteProject);

// GET /projects -> get all projects for the current user
router.get("/", protect, ingestionController.getUserProjects);

// GET /projects/:id -> Returns details for a single project
router.get("/:id", protect, ingestionController.getProjectById);

// GET /projects/:id/commits -> Returns the AI-summarized commit timeline
router.get("/:id/commits", protect, ingestionController.getProjectCommits);

module.exports = router;
