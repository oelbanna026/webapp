const mongoose = require("mongoose");
const { Player } = require("../models/Player");
const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { getPoolForRarity: getStaticPoolForRarity, templateKeyFor } = require("../utils/playerPool");
const { creditCoins, debitCoins } = require("./coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");
const { recordPackOpen } = require("./missionService");
const { getCurrentEvent } = require("./eventService");
const { getTemplatePoolForRarity } = require("./templatePoolService");

const RARITY_WEIGHTS = [
  { rarity: "common", weight: 60 },
  { rarity: "rare", weight: 25 },
  { rarity: "epic", weight: 10 },
  { rarity: "legendary", weight: 5 },
];

const DUPLICATE_COMPENSATION = {
  common: 200,
  rare: 600,
  epic: 2000,
  legendary: 10000,
};

const PACK_COST = 2500;

function pickRarity({ event, packType }) {
  const baseBoost = event?.packBoost || {};
  const extraBoost = packType === "event" ? { rare: 2, epic: 2, legendary: 1 } : {};
  const weights = RARITY_WEIGHTS.map((r) => {
    const bonus = Number((baseBoost[r.rarity] || 0) + (extraBoost[r.rarity] || 0));
    const w = r.weight + (Number.isFinite(bonus) ? bonus : 0);
    return { rarity: r.rarity, weight: Math.max(0, w) };
  });

  const total = weights.reduce((acc, r) => acc + r.weight, 0);
  const roll = Math.random() * total;
  let cursor = 0;
  for (const r of weights) {
    cursor += r.weight;
    if (roll <= cursor) return r.rarity;
  }
  return "common";
}

async function pickRandomTemplate({ rarity, event, packType }) {
  const dbPool = await getTemplatePoolForRarity(rarity);
  const pool = dbPool && dbPool.length ? dbPool : getStaticPoolForRarity(rarity);
  if (pool.length === 0) throw createHttpError(500, "No players available for rarity");
  const limitedKeys = Array.isArray(event?.limited) ? event.limited : [];
  const limitedPool = limitedKeys.length ? pool.filter((p) => limitedKeys.includes(templateKeyFor(p))) : [];

  const cfgChance = event?.eventPack?.limitedChance?.[rarity];
  const chance =
    packType === "event" && Number.isFinite(cfgChance)
      ? cfgChance
      : rarity === "legendary"
        ? 0.3
        : rarity === "epic"
          ? 0.2
          : rarity === "rare"
            ? 0.12
            : 0;
  if (limitedPool.length > 0 && Math.random() < chance) {
    return limitedPool[Math.floor(Math.random() * limitedPool.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

async function openPack({ userId, packType = "standard" }) {
  if (!mongoose.isValidObjectId(userId)) throw createHttpError(400, "Invalid user");
  if (packType !== "standard" && packType !== "event") throw createHttpError(400, "Invalid pack type");

  return runWithOptionalTransaction(async (session) => {
    const userBefore = session ? await User.findById(userId).session(session) : await User.findById(userId);
    if (!userBefore) throw createHttpError(404, "User not found");

    const event = getCurrentEvent();
    const eventPackCost = Number(event?.eventPack?.costCoins || 4000);
    const packCost = packType === "event" ? eventPackCost : PACK_COST;

    let usedStarterPack = false;
    let usedFreePack = false;
    if (packType === "standard") {
      if ((userBefore.starterPacks || 0) > 0) {
        userBefore.starterPacks -= 1;
        usedStarterPack = true;
        if (session) await userBefore.save({ session });
        else await userBefore.save();
      } else if ((userBefore.freePacks || 0) > 0) {
        userBefore.freePacks -= 1;
        usedFreePack = true;
        if (session) await userBefore.save({ session });
        else await userBefore.save();
      } else {
        await debitCoins({ userId, amount: PACK_COST, type: "PACK_OPEN" }, session);
      }
    } else {
      await debitCoins({ userId, amount: packCost, type: "PACK_OPEN_EVENT", meta: { eventId: event?.id || null } }, session);
    }

    const rarity = pickRarity({ event, packType });
    const template = await pickRandomTemplate({ rarity, event, packType });
    const templateKey = templateKeyFor(template);

    const dupQuery = { ownerId: userId, templateKey };
    const isDuplicate = session ? await Player.exists(dupQuery).session(session) : await Player.exists(dupQuery);

    const user = session ? await User.findById(userId).session(session) : await User.findById(userId);
    if (!user) throw createHttpError(404, "User not found");

    if (isDuplicate) {
      const coins = DUPLICATE_COMPENSATION[rarity] || 0;
      const { user: updated } = await creditCoins(
        { userId, amount: coins, type: "PACK_DUPLICATE_COMP", meta: { rarity } },
        session
      );
      await recordPackOpen(userId, session);

      return {
        duplicate: true,
        packType,
        rarity,
        coinsAwarded: coins,
        packCost,
        usedStarterPack,
        usedFreePack,
        event: event ? { id: event.id, name: event.name } : null,
        limitedHit: Array.isArray(event?.limited) ? event.limited.includes(templateKey) : false,
        player: { ...template, id: null, ownerId: String(userId), templateKey },
        user: updated.toPublicJSON(),
      };
    }

    const playerDoc = new Player({
      name: template.name,
      rating: template.rating,
      stats: template.stats,
      rarity: template.rarity,
      position: template.position || null,
      nation: template.nation || null,
      clubName: template.clubName || null,
      assets: template.assets || null,
      ownerId: user._id,
      templateKey,
    });

    if (session) await playerDoc.save({ session });
    else await playerDoc.save();

    await recordPackOpen(userId, session);
    const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);

    return {
      duplicate: false,
      packType,
      rarity,
      coinsAwarded: 0,
      packCost,
      usedStarterPack,
      usedFreePack,
      event: event ? { id: event.id, name: event.name } : null,
      limitedHit: Array.isArray(event?.limited) ? event.limited.includes(templateKey) : false,
      player: playerDoc.toPublicJSON(),
      user: refreshed.toPublicJSON(),
    };
  });
}

module.exports = { openPack, RARITY_WEIGHTS, DUPLICATE_COMPENSATION, PACK_COST };
