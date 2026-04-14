const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { getMyScouting, openMyScout } = require("../controllers/scoutingController");

const scoutingRouter = express.Router();

scoutingRouter.get("/me", requireAuth, getMyScouting);
scoutingRouter.post("/open", requireAuth, openMyScout);

module.exports = { scoutingRouter };

