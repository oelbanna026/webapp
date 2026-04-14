const { createHttpError } = require("../utils/createHttpError");
const { completeMatch, startMatch } = require("../services/matchService");

async function startMatchHandler(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const out = await startMatch({ userId });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
}

async function completeMatchHandler(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const { matchId } = req.body;
    const result = await completeMatch({ userId, matchId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { startMatchHandler, completeMatchHandler };
