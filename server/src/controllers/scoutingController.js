const { createHttpError } = require("../utils/createHttpError");
const { getScoutingStatus, openScout } = require("../services/scoutingService");

async function getMyScouting(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const data = await getScoutingStatus(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function openMyScout(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const mode = String(req.body?.mode || "standard");
    const out = await openScout({ userId, mode });
    res.json(out);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyScouting, openMyScout };

