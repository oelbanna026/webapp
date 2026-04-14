const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");

async function getGlobalLeaderboard(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const limit = Math.min(100, Math.max(5, Number(req.query.limit || 50)));

    const users = await User.find()
      .sort({ rankRating: -1, xp: -1, createdAt: 1 })
      .limit(limit)
      .select({ username: 1, rankRating: 1, xp: 1 });

    res.json({
      leaderboard: users.map((u, idx) => ({
        rank: idx + 1,
        userId: String(u._id),
        username: u.username,
        rankRating: u.rankRating ?? 1000,
        xp: u.xp ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGlobalLeaderboard };

