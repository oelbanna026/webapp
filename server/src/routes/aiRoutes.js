const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { generateLogo } = require("../controllers/aiController");

const aiRouter = express.Router();

aiRouter.post("/logo", requireAuth, generateLogo);

module.exports = { aiRouter };

