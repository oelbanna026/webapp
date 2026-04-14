const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { completeMatchHandler, startMatchHandler } = require("../controllers/matchController");

const matchRouter = express.Router();

matchRouter.post("/start", requireAuth, startMatchHandler);
matchRouter.post("/complete", requireAuth, completeMatchHandler);

module.exports = { matchRouter };
