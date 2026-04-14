const { createHttpError } = require("../utils/createHttpError");
const { spendStatPoint } = require("../services/progressionService");

async function upgradePlayer(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const playerId = req.params.id;
    const stat = String(req.body.stat || "");
    const amount = req.body.amount;

    const out = await spendStatPoint({ userId, playerId, stat, amount });
    res.json(out);
  } catch (err) {
    next(err);
  }
}

module.exports = { upgradePlayer };

