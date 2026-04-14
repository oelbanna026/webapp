const mongoose = require("mongoose");
const { Club } = require("../models/Club");
const { Match } = require("../models/Match");
const { Player } = require("../models/Player");
const { Squad } = require("../models/Squad");
const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { creditCoins } = require("./coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");
const { computeTeamPower } = require("../utils/teamPower");
const { getFormationKeys } = require("../utils/squad");
const { ensureIdentityForPlayers } = require("../utils/playerIdentity");
const { awardPlayerXp } = require("./progressionService");
const { consumeEnergy } = require("./energyService");
const { recordMatchWin } = require("./missionService");

function clampInt(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min) return null;
  if (i > max) return null;
  return i;
}

async function startMatch({ userId }) {
  if (!mongoose.isValidObjectId(userId)) throw createHttpError(400, "Invalid user");

  return runWithOptionalTransaction(async (session) => {
    await consumeEnergy({ userId, amount: 1 }, session);

    const clubQ = Club.findOne({ userId });
    const club = session ? await clubQ.session(session) : await clubQ;
    if (!club) throw createHttpError(409, "Create a club first");

    const squadQ = Squad.findOne({ userId });
    const squad = session ? await squadQ.session(session) : await squadQ;
    if (!squad) throw createHttpError(409, "Create a squad first");

    const formation = String(squad.formation || "4-3-3");
    const formationKeys = getFormationKeys(formation);
    if (!Array.isArray(formationKeys) || formationKeys.length === 0) throw createHttpError(400, "Invalid formation");

    const ids = formationKeys.map((k) => squad.slots?.[k]).filter(Boolean).map(String);
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length !== ids.length) throw createHttpError(409, "Invalid squad (duplicate players)");

    const playersQ = Player.find({ _id: { $in: uniqueIds } });
    const players = session ? await playersQ.session(session) : await playersQ;
    if (players.length !== uniqueIds.length) throw createHttpError(409, "Squad contains missing players");

    await ensureIdentityForPlayers(Player, players, session);

    const playersById = Object.fromEntries(players.map((p) => [String(p._id), p]));
    const slots = {};
    for (const key of formationKeys) slots[key] = squad.slots?.[key] ? String(squad.slots[key]) : null;

    const breakdown = computeTeamPower({ formation, slots, playersById, coach: club.coach });

    const seed = Math.floor(Math.random() * 2 ** 31);
    const randomFactor = 0.8 + Math.random() * 0.4;
    const opponentPower = 65 + Math.random() * 25;
    const resultScore = Math.round((breakdown.teamPower / 3) * randomFactor);

    const created = await Match.create(
      [
        {
          userId,
          seed,
          status: "in_progress",
          formation,
          squadPlayerIds: breakdown.squadPlayerIds,
          coachBonus: breakdown.coachBonus,
          chemistryScore: breakdown.chemistryScore,
          chemistryBonus: breakdown.chemistryBonus,
          attack: breakdown.attack,
          midfield: breakdown.midfield,
          defense: breakdown.defense,
          teamPower: breakdown.teamPower,
          randomFactor,
          opponentPower,
          resultScore,
        },
      ],
      session ? { session } : undefined
    );
    const match = created[0];

    const u = session ? await User.findById(userId).session(session) : await User.findById(userId);

    return {
      match: {
        id: String(match._id),
        status: match.status,
        formation: match.formation,
        attack: match.attack,
        midfield: match.midfield,
        defense: match.defense,
        coachBonus: match.coachBonus,
        chemistryScore: match.chemistryScore,
        chemistryBonus: match.chemistryBonus,
        teamPower: match.teamPower,
        createdAt: match.createdAt.toISOString(),
      },
      user: u ? u.toPublicJSON() : null,
    };
  });
}

async function completeMatch({ userId, matchId }) {
  if (!mongoose.isValidObjectId(userId)) throw createHttpError(400, "Invalid user");
  if (!mongoose.isValidObjectId(matchId)) throw createHttpError(400, "Invalid matchId");

  return runWithOptionalTransaction(async (session) => {
    const q = Match.findOne({ _id: matchId, userId });
    const match = session ? await q.session(session) : await q;
    if (!match) throw createHttpError(404, "Match not found");
    if (match.status !== "in_progress") throw createHttpError(409, "Match already completed");

    const score = clampInt(match.resultScore, { min: 0, max: 200 }) ?? 0;
    const opponent = Number(match.opponentPower) || 0;
    const outcome = score >= opponent ? "win" : "loss";

    const winCoins = clampInt(800 + Math.random() * 700, { min: 1, max: 1000000 });
    const lossCoins = clampInt(200 + Math.random() * 250, { min: 1, max: 1000000 });
    const rewardCoins = outcome === "win" ? winCoins : lossCoins;
    const rewardXp = outcome === "win" ? 120 : 50;
    const rewardPacks = outcome === "win" ? 1 : 0;

    match.status = "completed";
    match.outcome = outcome;
    match.rewardCoins = rewardCoins;
    match.rewardXp = rewardXp;
    match.rewardPacks = rewardPacks;
    match.completedAt = new Date();

    if (session) await match.save({ session });
    else await match.save();

    const txType = outcome === "win" ? "MATCH_WIN" : "MATCH_LOSS";
    await creditCoins(
      { userId, amount: rewardCoins, type: txType, idempotencyKey: `match:${matchId}`, meta: { matchId: String(match._id) } },
      session
    );

    const userDoc = session ? await User.findById(userId).session(session) : await User.findById(userId);
    if (!userDoc) throw createHttpError(404, "User not found");
    userDoc.matchesPlayedTotal = (userDoc.matchesPlayedTotal || 0) + 1;
    userDoc.xp = (userDoc.xp || 0) + rewardXp;
    if (rewardPacks > 0) userDoc.freePacks = (userDoc.freePacks || 0) + rewardPacks;

    const K = 24;
    const expected = 1 / (1 + 10 ** (((match.opponentPower || 1000) - (userDoc.rankRating || 1000)) / 400));
    const actual = outcome === "win" ? 1 : 0;
    const delta = Math.round(K * (actual - expected));
    userDoc.rankRating = Math.max(0, (userDoc.rankRating || 1000) + delta);
    if (outcome === "win") userDoc.winsTotal = (userDoc.winsTotal || 0) + 1;

    if (session) await userDoc.save({ session });
    else await userDoc.save();

    if (outcome === "win") {
      await recordMatchWin(userId, session);
    }

    await awardPlayerXp(
      { userId, playerIds: match.squadPlayerIds || [], xpPerPlayer: outcome === "win" ? 35 : 18, idempotencyKey: `pxp:${matchId}` },
      session
    );

    return {
      match: {
        id: String(match._id),
        status: match.status,
        outcome,
        attack: match.attack,
        midfield: match.midfield,
        defense: match.defense,
        coachBonus: match.coachBonus,
        chemistryScore: match.chemistryScore,
        chemistryBonus: match.chemistryBonus,
        teamPower: match.teamPower,
        randomFactor: match.randomFactor,
        opponentPower: match.opponentPower,
        resultScore: match.resultScore,
        rewardCoins,
        rewardXp,
        rewardPacks,
        rankDelta: delta,
        rankRating: userDoc.rankRating,
        completedAt: match.completedAt.toISOString(),
      },
      user: userDoc.toPublicJSON(),
    };
  });
}

module.exports = { startMatch, completeMatch };
