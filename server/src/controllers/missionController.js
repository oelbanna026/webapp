const { createHttpError } = require("../utils/createHttpError");
const { claimMission, getMissions } = require("../services/missionService");

async function getMyMissions(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const out = await getMissions(userId);
    res.json(out);
  } catch (err) {
    next(err);
  }
}

async function claimMyMission(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const missionId = String(req.body.missionId || "");
    const out = await claimMission({ userId, missionId });
    res.json(out);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyMissions, claimMyMission };

