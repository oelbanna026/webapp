const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { creditCoins } = require("../services/coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");

const DAILY_REWARD_COINS = 1500;
const DAILY_REWARD_PACKS = 1;

function dayKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function diffDays(a, b) {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((db - da) / (24 * 60 * 60 * 1000));
}

function canClaimDaily(lastDailyClaimAt) {
  if (!lastDailyClaimAt) return true;
  const elapsedMs = Date.now() - new Date(lastDailyClaimAt).getTime();
  return elapsedMs >= 24 * 60 * 60 * 1000;
}

async function claimDaily(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const out = await runWithOptionalTransaction(async (session) => {
      const user = session ? await User.findById(userId).session(session) : await User.findById(userId);
      if (!user) throw createHttpError(404, "User not found");
      if (!canClaimDaily(user.lastDailyClaimAt)) throw createHttpError(409, "Daily reward already claimed");

      const now = new Date();
      const last = user.lastDailyClaimAt ? new Date(user.lastDailyClaimAt) : null;
      if (!last) user.dailyStreak = 1;
      else {
        const d = diffDays(last, now);
        if (d === 1) user.dailyStreak = (user.dailyStreak || 0) + 1;
        else user.dailyStreak = 1;
      }

      user.lastDailyClaimAt = now;
      user.freePacks = (user.freePacks || 0) + DAILY_REWARD_PACKS;
      if (session) await user.save({ session });
      else await user.save();

      const { user: updated } = await creditCoins(
        { userId, amount: DAILY_REWARD_COINS, type: "DAILY_REWARD", idempotencyKey: `daily:${user.lastDailyClaimAt.toISOString()}` },
        session
      );

      const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);
      const u = refreshed || updated;
      return { user: u.toPublicJSON(), coinsAwarded: DAILY_REWARD_COINS, packsAwarded: DAILY_REWARD_PACKS, streak: u.dailyStreak, day: dayKey(now) };
    });

    res.json(out);
  } catch (err) {
    next(err);
  }
}

module.exports = { claimDaily, DAILY_REWARD_COINS };
