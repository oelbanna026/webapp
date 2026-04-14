const { CoinTransaction } = require("../models/CoinTransaction");
const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");

async function getWallet(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const user = await User.findById(userId);
    if (!user) throw createHttpError(404, "User not found");

    const txs = await CoinTransaction.find({ userId }).sort({ createdAt: -1 }).limit(50);

    res.json({
      balance: user.coins,
      transactions: txs.map((t) => ({
        id: String(t._id),
        type: t.type,
        delta: t.delta,
        balanceAfter: t.balanceAfter,
        meta: t.meta,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getWallet };

