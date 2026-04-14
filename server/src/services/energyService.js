const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");

const ENERGY_MAX = 10;
const ENERGY_REGEN_MS = 15 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function ensureEnergyFields(user) {
  let changed = false;
  if (user.energyUpdatedAt == null) {
    user.energyUpdatedAt = new Date();
    changed = true;
  }
  if (user.energy == null) {
    user.energy = ENERGY_MAX;
    changed = true;
  }
  return changed;
}

function syncEnergy(user, atMs = nowMs()) {
  const initialized = ensureEnergyFields(user);
  const last = new Date(user.energyUpdatedAt).getTime();
  const energy = Number(user.energy) || 0;
  if (energy >= ENERGY_MAX) {
    user.energy = ENERGY_MAX;
    return initialized;
  }
  const elapsed = Math.max(0, atMs - last);
  const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (gained <= 0) return initialized;
  user.energy = Math.min(ENERGY_MAX, energy + gained);
  const remainder = elapsed % ENERGY_REGEN_MS;
  user.energyUpdatedAt = new Date(atMs - remainder);
  return true;
}

async function consumeEnergy({ userId, amount = 1 }, session) {
  const inc = Math.max(1, Math.floor(Number(amount) || 1));
  const q = User.findById(userId);
  const user = session ? await q.session(session) : await q;
  if (!user) throw createHttpError(404, "User not found");
  syncEnergy(user);
  if ((user.energy || 0) < inc) throw createHttpError(409, "Not enough energy");
  user.energy -= inc;
  if (session) await user.save({ session });
  else await user.save();
  return user;
}

module.exports = { ENERGY_MAX, ENERGY_REGEN_MS, syncEnergy, consumeEnergy };
