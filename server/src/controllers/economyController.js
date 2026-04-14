const { CoinTransaction } = require("../models/CoinTransaction");
const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");

function clampInt(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min) return null;
  if (i > max) return null;
  return i;
}

function personaForUser(user) {
  const gamer = Number(user.packsOpenedTotal || 0);
  const trader = Number(user.marketTradesTotal || 0);
  const competitor = Number(user.matchesPlayedTotal || 0);
  const arr = [
    { id: "gamer", label: "Gamer", score: gamer },
    { id: "trader", label: "Trader", score: trader },
    { id: "competitor", label: "Competitor", score: competitor },
  ].sort((a, b) => b.score - a.score);

  const primary = arr[0];
  const total = gamer + trader + competitor || 1;
  return {
    primary: primary.id,
    scores: {
      gamer,
      trader,
      competitor,
    },
    weights: {
      gamer: Math.round((gamer / total) * 100),
      trader: Math.round((trader / total) * 100),
      competitor: Math.round((competitor / total) * 100),
    },
  };
}

async function getMyEconomy(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const days = clampInt(req.query.days, { min: 1, max: 90 }) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const user = await User.findById(userId).select({
      packsOpenedTotal: 1,
      marketTradesTotal: 1,
      matchesPlayedTotal: 1,
      winsTotal: 1,
    });
    if (!user) throw createHttpError(404, "User not found");

    const rows = await CoinTransaction.aggregate([
      { $match: { userId: user._id, createdAt: { $gte: since } } },
      { $group: { _id: "$type", delta: { $sum: "$delta" }, count: { $sum: 1 } } },
      { $sort: { delta: -1 } },
    ]);

    const byType = rows.map((r) => ({ type: r._id, delta: r.delta, count: r.count }));
    const income = byType.filter((t) => t.delta > 0).reduce((acc, t) => acc + t.delta, 0);
    const expense = byType.filter((t) => t.delta < 0).reduce((acc, t) => acc + t.delta, 0);

    res.json({
      windowDays: days,
      totals: { income, expense, net: income + expense },
      byType,
      persona: personaForUser(user),
      stats: { matchesPlayedTotal: user.matchesPlayedTotal || 0, winsTotal: user.winsTotal || 0 },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyEconomy };

