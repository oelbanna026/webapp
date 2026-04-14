const mongoose = require("mongoose");
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

async function findExistingTx({ userId, idempotencyKey }, session) {
  if (!idempotencyKey) return null;
  const q = CoinTransaction.findOne({ userId, idempotencyKey });
  return session ? q.session(session) : q;
}

async function recordTx({ userId, type, delta, balanceAfter, idempotencyKey, meta }, session) {
  const tx = new CoinTransaction({ userId, type, delta, balanceAfter, idempotencyKey: idempotencyKey || null, meta: meta || null });
  if (session) await tx.save({ session });
  else await tx.save();
  return tx;
}

async function creditCoins({ userId, amount, type, idempotencyKey, meta }, session) {
  const n = clampInt(amount, { min: 1, max: 100_000_000 });
  if (!n) throw createHttpError(400, "Invalid amount");
  if (!type) throw createHttpError(400, "Missing transaction type");

  const existing = await findExistingTx({ userId, idempotencyKey }, session);
  if (existing) {
    const u = session ? await User.findById(userId).session(session) : await User.findById(userId);
    return { user: u, tx: existing };
  }

  const q = User.findOneAndUpdate({ _id: userId }, { $inc: { coins: n } }, { new: true });
  const user = session ? await q.session(session) : await q;
  if (!user) throw createHttpError(404, "User not found");

  const tx = await recordTx({ userId, type, delta: n, balanceAfter: user.coins, idempotencyKey, meta }, session);
  return { user, tx };
}

async function debitCoins({ userId, amount, type, idempotencyKey, meta }, session) {
  const n = clampInt(amount, { min: 1, max: 100_000_000 });
  if (!n) throw createHttpError(400, "Invalid amount");
  if (!type) throw createHttpError(400, "Missing transaction type");

  const existing = await findExistingTx({ userId, idempotencyKey }, session);
  if (existing) {
    const u = session ? await User.findById(userId).session(session) : await User.findById(userId);
    return { user: u, tx: existing };
  }

  const q = User.findOneAndUpdate({ _id: userId, coins: { $gte: n } }, { $inc: { coins: -n } }, { new: true });
  const user = session ? await q.session(session) : await q;
  if (!user) throw createHttpError(409, "Insufficient coins");

  const tx = await recordTx({ userId, type, delta: -n, balanceAfter: user.coins, idempotencyKey, meta }, session);
  return { user, tx };
}

function isValidObjectId(v) {
  return mongoose.isValidObjectId(v);
}

module.exports = { creditCoins, debitCoins, isValidObjectId };
