const mongoose = require("mongoose");
const { Player } = require("../models/Player");
const { createHttpError } = require("../utils/createHttpError");
const { debitCoins } = require("./coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");

const STAT_KEYS = ["pace", "shooting", "passing", "defense"];

const STAT_POINTS_PER_LEVEL = {
  common: 1,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const UPGRADE_CAP_POINTS = {
  common: 10,
  rare: 20,
  epic: 30,
  legendary: 40,
};

function clampInt(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min) return null;
  if (i > max) return null;
  return i;
}

function upgradeCost({ player }) {
  const base = player.rarity === "legendary" ? 3500 : player.rarity === "epic" ? 2200 : player.rarity === "rare" ? 1400 : 900;
  return base + player.level * 120;
}

function levelUpThreshold(level) {
  return 200 + level * 60;
}

function recalcRating(stats) {
  const s = stats || {};
  const pace = Number(s.pace) || 0;
  const shooting = Number(s.shooting) || 0;
  const passing = Number(s.passing) || 0;
  const defense = Number(s.defense) || 0;
  return Math.round((pace + shooting + passing + defense) / 4);
}

function applyLevelUps(player) {
  let leveled = 0;
  while (player.level < 50) {
    const need = levelUpThreshold(player.level);
    if (player.xp < need) break;
    player.xp -= need;
    player.level += 1;
    player.statPoints += STAT_POINTS_PER_LEVEL[player.rarity] || 1;
    leveled += 1;
  }
  return leveled;
}

async function awardPlayerXp({ userId, playerIds, xpPerPlayer, idempotencyKey }, session) {
  const xp = clampInt(xpPerPlayer, { min: 1, max: 5000 });
  if (!xp) return;

  const unique = Array.from(new Set((playerIds || []).filter(Boolean).map(String))).filter((id) =>
    mongoose.isValidObjectId(id)
  );
  if (unique.length === 0) return;

  const q = Player.find({ _id: { $in: unique }, ownerId: userId });
  const players = session ? await q.session(session) : await q;
  if (players.length === 0) return;

  for (const p of players) {
    p.xp += xp;
    applyLevelUps(p);
  }

  if (session) {
    await Promise.all(players.map((p) => p.save({ session })));
  } else {
    await Promise.all(players.map((p) => p.save()));
  }
}

async function spendStatPoint({ userId, playerId, stat, amount = 1 }) {
  if (!mongoose.isValidObjectId(playerId)) throw createHttpError(400, "Invalid playerId");
  if (!STAT_KEYS.includes(stat)) throw createHttpError(400, "Invalid stat");
  const inc = clampInt(amount, { min: 1, max: 10 });
  if (!inc) throw createHttpError(400, "Invalid amount");

  return runWithOptionalTransaction(async (session) => {
    const q = Player.findById(playerId);
    const player = session ? await q.session(session) : await q;
    if (!player) throw createHttpError(404, "Player not found");
    if (!player.ownerId || String(player.ownerId) !== String(userId)) throw createHttpError(403, "You do not own this player");
    const cap = UPGRADE_CAP_POINTS[player.rarity] || 10;
    const current = Number(player.stats?.[stat] || 0);
    const remainingCap = Math.max(0, cap - (player.upgradeSpent || 0));
    const remainingStat = Math.max(0, 99 - current);
    const remainingPoints = Math.max(0, player.statPoints || 0);
    const applied = Math.min(inc, remainingCap, remainingStat, remainingPoints);
    if (applied <= 0) {
      if (remainingPoints <= 0) throw createHttpError(409, "Not enough stat points");
      if (remainingCap <= 0) throw createHttpError(409, "Upgrade cap reached for this rarity");
      throw createHttpError(409, "Stat is already maxed");
    }

    const cost = upgradeCost({ player }) * applied;
    await debitCoins(
      { userId, amount: cost, type: "PLAYER_UPGRADE", meta: { playerId: String(player._id), stat, amount: applied } },
      session
    );

    player.statPoints -= applied;
    player.upgradeSpent = (player.upgradeSpent || 0) + applied;
    player.stats[stat] = Math.min(99, (player.stats[stat] || 0) + applied);
    player.rating = recalcRating(player.stats);

    if (session) await player.save({ session });
    else await player.save();

    return { player: player.toPublicJSON(), cost, cap, applied };
  });
}

module.exports = { awardPlayerXp, spendStatPoint, STAT_KEYS, UPGRADE_CAP_POINTS, STAT_POINTS_PER_LEVEL };
