const { Player } = require("../models/Player");
const { User } = require("../models/User");
const { PlayerTemplate } = require("../models/PlayerTemplate");
const { createHttpError } = require("../utils/createHttpError");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");
const { creditCoins, debitCoins } = require("./coinService");
const { getTemplatePoolForRarity } = require("./templatePoolService");
const { templateKeyFor } = require("../utils/playerPool");

const STANDARD_COST_COINS = 0;
const PREMIUM_COST_COINS = 1500;

const STANDARD_WEIGHTS = [
  ["common", 0.72],
  ["rare", 0.22],
  ["epic", 0.055],
  ["legendary", 0.005],
];

const PREMIUM_WEIGHTS = [
  ["common", 0.55],
  ["rare", 0.3],
  ["epic", 0.12],
  ["legendary", 0.03],
];

const DUPLICATE_COMP = {
  common: 250,
  rare: 600,
  epic: 1400,
  legendary: 3000,
};

function dayKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function ensureScoutingDay(user, now = new Date()) {
  const key = dayKey(now);
  if (user.scoutingDay !== key) {
    user.scoutingDay = key;
    user.scoutingTokens = Math.max(0, user.scoutingTokensCap || 3);
    return true;
  }
  return false;
}

function pickWeighted(weights) {
  const r = Math.random();
  let acc = 0;
  for (const [key, w] of weights) {
    acc += w;
    if (r <= acc) return key;
  }
  return weights[weights.length - 1][0];
}

async function pickTemplate(rarity) {
  const dbPool = await getTemplatePoolForRarity(rarity);
  const pool = dbPool && dbPool.length ? dbPool : [];
  if (!pool.length) throw createHttpError(409, "No imported players available. Import a team/league first.");
  return pool[Math.floor(Math.random() * pool.length)];
}

async function hasImportedTemplates(session) {
  const q = PlayerTemplate.exists({ isActive: true });
  const out = session ? await q.session(session) : await q;
  return !!out;
}

async function getScoutingStatus(userId) {
  const user = await User.findById(userId);
  if (!user) throw createHttpError(404, "User not found");
  const changed = ensureScoutingDay(user);
  if (changed) await user.save();

  const now = new Date();
  const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const canScout = await hasImportedTemplates();
  return {
    day: user.scoutingDay,
    tokens: user.scoutingTokens || 0,
    cap: user.scoutingTokensCap || 3,
    nextResetAt: nextReset.toISOString(),
    canScout,
  };
}

async function openScout({ userId, mode = "standard" }) {
  return runWithOptionalTransaction(async (session) => {
    const q = User.findById(userId);
    const user = session ? await q.session(session) : await q;
    if (!user) throw createHttpError(404, "User not found");
    ensureScoutingDay(user);

    const scoutingMode = mode === "premium" ? "premium" : "standard";
    const costCoins = scoutingMode === "premium" ? PREMIUM_COST_COINS : STANDARD_COST_COINS;
    if ((user.scoutingTokens || 0) <= 0) throw createHttpError(409, "No scouting tokens");
    if (!(await hasImportedTemplates(session))) throw createHttpError(409, "No imported players available. Import a team/league first.");

    user.scoutingTokens = Math.max(0, (user.scoutingTokens || 0) - 1);
    if (session) await user.save({ session });
    else await user.save();

    if (costCoins > 0) {
      await debitCoins({ userId, amount: costCoins, type: "SCOUT_PREMIUM", meta: { mode: scoutingMode } }, session);
    }

    const rarity = pickWeighted(scoutingMode === "premium" ? PREMIUM_WEIGHTS : STANDARD_WEIGHTS);
    const template = await pickTemplate(rarity);
    const templateKey = templateKeyFor(template);

    const dupQuery = { ownerId: userId, templateKey };
    const isDuplicate = session ? await Player.exists(dupQuery).session(session) : await Player.exists(dupQuery);
    if (isDuplicate) {
      const coins = DUPLICATE_COMP[rarity] || 0;
      const { user: updated } = await creditCoins({ userId, amount: coins, type: "SCOUT_DUPLICATE_COMP", meta: { rarity, mode: scoutingMode } }, session);
      const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);
      return {
        duplicate: true,
        mode: scoutingMode,
        rarity,
        scoutCost: costCoins,
        coinsAwarded: coins,
        player: { ...template, id: null, ownerId: String(userId), templateKey },
        user: (refreshed || updated).toPublicJSON(),
      };
    }

    const playerDoc = new Player({
      name: template.name,
      rating: template.rating,
      stats: template.stats,
      rarity: template.rarity,
      nation: template.nation || null,
      clubName: template.clubName || null,
      ownerId: user._id,
      templateKey,
    });

    if (session) await playerDoc.save({ session });
    else await playerDoc.save();

    const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);
    return {
      duplicate: false,
      mode: scoutingMode,
      rarity,
      scoutCost: costCoins,
      coinsAwarded: 0,
      player: playerDoc.toPublicJSON(),
      user: refreshed.toPublicJSON(),
    };
  });
}

module.exports = { getScoutingStatus, openScout };
