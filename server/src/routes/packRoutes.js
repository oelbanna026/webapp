const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { openPackHandler } = require("../controllers/packController");

const packRouter = express.Router();

packRouter.post("/open", requireAuth, openPackHandler);

module.exports = { packRouter };
