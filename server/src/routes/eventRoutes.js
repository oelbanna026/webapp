const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { getCurrent } = require("../controllers/eventController");

const eventRouter = express.Router();

eventRouter.get("/current", requireAuth, getCurrent);

module.exports = { eventRouter };

