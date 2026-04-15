const { Club } = require("../models/Club");
const { createHttpError } = require("../utils/createHttpError");
const { User } = require("../models/User");
const { PlayerTemplate } = require("../models/PlayerTemplate");
const { Player } = require("../models/Player");
const { Squad } = require("../models/Squad");
const { creditCoins } = require("../services/coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");
const { getContentConfig } = require("../config/content");
const { findTeam } = require("../content/leagueRegistry");

function normalizeName(name) {
  return String(name || "").trim();
}

function toNameLower(name) {
  return normalizeName(name).toLowerCase();
}

function isValidHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function normalizeMonogram(value) {
  const raw = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return null;
  return raw.slice(0, 3);
}

const STADIUM_PRESETS = [
  { id: "night-bowl", name: "Night Bowl" },
  { id: "neon-dome", name: "Neon Dome" },
  { id: "classic-park", name: "Classic Park" },
];

function resolveStadium({ stadiumId, theme }) {
  const requested = String(stadiumId || "").trim();
  const found = requested ? STADIUM_PRESETS.find((s) => s.id === requested) : null;
  if (found) return found;
  if (theme === "neon") return STADIUM_PRESETS.find((s) => s.id === "neon-dome");
  if (theme === "classic") return STADIUM_PRESETS.find((s) => s.id === "classic-park");
  return STADIUM_PRESETS.find((s) => s.id === "night-bowl");
}

function coachBonuses(type) {
  if (type === "attacking") return { type, bonusAttack: 10, bonusDefense: 0, bonusAll: 0 };
  if (type === "defensive") return { type, bonusAttack: 0, bonusDefense: 10, bonusAll: 0 };
  return { type: "balanced", bonusAttack: 0, bonusDefense: 0, bonusAll: 5 };
}

function avgRating(players) {
  if (!players.length) return 0;
  const sum = players.reduce((acc, p) => acc + Number(p.rating || 0), 0);
  return Math.round(sum / players.length);
}

async function checkName(req, res, next) {
  try {
    const name = normalizeName(req.query.name);
    if (name.length < 3) return res.json({ ok: true, available: false });

    const nameLower = toNameLower(name);
    const exists = await Club.exists({ nameLower });
    res.json({ ok: true, available: !exists });
  } catch (err) {
    next(err);
  }
}

async function getMyClub(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const club = await Club.findOne({ userId });
    res.json({ club: club ? club.toPublicJSON() : null });
  } catch (err) {
    next(err);
  }
}

async function createClub(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const name = normalizeName(req.body.name);
    if (name.length < 3 || name.length > 32) throw createHttpError(400, "Invalid club name");

    const nameLower = toNameLower(name);
    const kitPrimary = String(req.body.kit?.primary || "");
    const kitSecondary = String(req.body.kit?.secondary || "");
    if (!isValidHex(kitPrimary) || !isValidHex(kitSecondary)) throw createHttpError(400, "Invalid kit colors");

    const coachType = String(req.body.coach?.type || "balanced");
    if (!["attacking", "defensive", "balanced"].includes(coachType)) throw createHttpError(400, "Invalid coach");

    const theme = String(req.body.theme || "night");
    if (!["night", "neon", "classic"].includes(theme)) throw createHttpError(400, "Invalid theme");

    const stadium = resolveStadium({ stadiumId: req.body.stadium?.id, theme });

    const logoType = String(req.body.logo?.type || "preset");
    if (!["preset", "ai"].includes(logoType)) throw createHttpError(400, "Invalid logo type");

    const logo = {
      type: logoType,
      presetId: logoType === "preset" ? String(req.body.logo?.presetId || "") : null,
      url: logoType === "ai" ? String(req.body.logo?.url || "") : null,
      meta: logoType === "ai" ? (req.body.logo?.meta ? req.body.logo.meta : null) : null,
    };
    if (logoType === "preset" && !logo.presetId) throw createHttpError(400, "Missing preset logo");
    if (logoType === "ai" && !logo.url) throw createHttpError(400, "Missing AI logo url");
    if (logoType === "ai" && logo.meta) {
      const style = String(logo.meta.style || "").trim();
      if (style && !["minimal", "aggressive", "classic"].includes(style)) throw createHttpError(400, "Invalid logo style");
      const monogram = normalizeMonogram(logo.meta.monogram);
      logo.meta = { style: style || null, monogram };
    }

    const hookCoins = 2000;
    const hookPacks = 2;

    const content = getContentConfig();
    const leagueKey = String(req.body.affiliation?.leagueKey || content.leagueKeys?.[0] || "egypt")
      .trim()
      .toLowerCase();
    const teamName = String(req.body.affiliation?.teamName || "").trim();
    if (!teamName) throw createHttpError(400, "Missing team selection");
    const teamMeta = findTeam(leagueKey, teamName);
    if (!teamMeta) throw createHttpError(400, "Invalid team selection");

    const { club: created, user: updatedUser } = await runWithOptionalTransaction(async (session) => {
      const club = await Club.create(
        [
          {
            userId,
            name,
            nameLower,
            logo,
            kit: { primary: kitPrimary, secondary: kitSecondary },
            coach: coachBonuses(coachType),
            theme,
            stadium,
            affiliation: { leagueKey, teamName, tier: teamMeta.tier, style: teamMeta.style },
          },
        ],
        session ? { session } : undefined
      );

      const u = session ? await User.findById(userId).session(session) : await User.findById(userId);
      if (!u) throw createHttpError(404, "User not found");
      u.starterPacks = (u.starterPacks || 0) + hookPacks;
      if (session) await u.save({ session });
      else await u.save();

      const templateQuery = { isActive: true, "source.leagueKey": leagueKey, "source.teamName": teamName };
      const templates = session ? await PlayerTemplate.find(templateQuery).session(session) : await PlayerTemplate.find(templateQuery);
      if (templates.length < 11) throw createHttpError(409, "Not enough players for selected team");

      const upperPos = (t) => String(t.position || "").toUpperCase();
      const sortByRating = (arr) => arr.slice().sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      const pool = sortByRating(templates);
      const used = new Set();
      const takeFirst = (arr) => {
        for (const t of arr) {
          const key = String(t.templateKey);
          if (used.has(key)) continue;
          used.add(key);
          return t;
        }
        return null;
      };

      const gk = takeFirst(sortByRating(pool.filter((t) => upperPos(t) === "GK"))) || takeFirst(pool);
      const def = sortByRating(pool.filter((t) => ["RB", "LB", "CB", "RCB", "LCB", "RWB", "LWB"].includes(upperPos(t))));
      const mid = sortByRating(pool.filter((t) => ["CDM", "LDM", "RDM", "CM", "LCM", "RCM", "CAM", "LAM", "RAM"].includes(upperPos(t))));
      const atk = sortByRating(pool.filter((t) => ["ST", "ST2", "LW", "RW", "LM", "RM"].includes(upperPos(t))));

      const lb = takeFirst(sortByRating(def.filter((t) => ["LB", "LWB"].includes(upperPos(t))))) || takeFirst(def);
      const lcb = takeFirst(sortByRating(def.filter((t) => ["LCB", "CB"].includes(upperPos(t))))) || takeFirst(def);
      const rcb = takeFirst(sortByRating(def.filter((t) => ["RCB", "CB"].includes(upperPos(t))))) || takeFirst(def);
      const rb = takeFirst(sortByRating(def.filter((t) => ["RB", "RWB"].includes(upperPos(t))))) || takeFirst(def);

      const lcm = takeFirst(mid);
      const cm = takeFirst(mid);
      const rcm = takeFirst(mid);

      const lw = takeFirst(sortByRating(atk.filter((t) => ["LW", "LM"].includes(upperPos(t))))) || takeFirst(atk);
      const st = takeFirst(sortByRating(atk.filter((t) => ["ST", "ST2"].includes(upperPos(t))))) || takeFirst(atk);
      const rw = takeFirst(sortByRating(atk.filter((t) => ["RW", "RM"].includes(upperPos(t))))) || takeFirst(atk);

      const picked = [gk, lb, lcb, rcb, rb, lcm, cm, rcm, lw, st, rw].filter(Boolean);
      const remaining = pool.filter((t) => !used.has(String(t.templateKey)));
      while (picked.length < 11 && remaining.length) picked.push(remaining.shift());
      if (picked.length < 11) throw createHttpError(409, "Not enough players for starter squad");

      const playerDocs = picked.slice(0, 11).map((t) => ({
        name: t.name,
        rating: t.rating,
        stats: t.stats,
        rarity: t.rarity,
        nation: t.nation || null,
        clubName: t.clubName || null,
        ownerId: u._id,
        templateKey: t.templateKey,
      }));
      const createdPlayers = session ? await Player.insertMany(playerDocs, { session }) : await Player.insertMany(playerDocs);

      const slots = {
        GK: createdPlayers[0]?._id || null,
        LB: createdPlayers[1]?._id || null,
        LCB: createdPlayers[2]?._id || null,
        RCB: createdPlayers[3]?._id || null,
        RB: createdPlayers[4]?._id || null,
        LCM: createdPlayers[5]?._id || null,
        CM: createdPlayers[6]?._id || null,
        RCM: createdPlayers[7]?._id || null,
        LW: createdPlayers[8]?._id || null,
        ST: createdPlayers[9]?._id || null,
        RW: createdPlayers[10]?._id || null,
      };
      const rating = avgRating(createdPlayers);
      const q = Squad.findOneAndUpdate({ userId }, { $set: { formation: "4-3-3", slots, rating } }, { upsert: true, new: true });
      if (session) await q.session(session);
      else await q;

      const { user: afterCredit } = await creditCoins(
        { userId, amount: hookCoins, type: "CLUB_CREATION_HOOK", idempotencyKey: `club-hook:${nameLower}` },
        session
      );

      const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);
      return { club: club[0], user: refreshed || afterCredit };
    });

    res.status(201).json({
      club: created.toPublicJSON(),
      hook: { coins: hookCoins, packs: hookPacks, user: updatedUser.toPublicJSON() },
    });
  } catch (err) {
    if (err && err.code === 11000) return next(createHttpError(409, "Club name already in use"));
    next(err);
  }
}

async function updateCoach(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const coachType = String(req.body.coach?.type || "");
    if (!["attacking", "defensive", "balanced"].includes(coachType)) throw createHttpError(400, "Invalid coach");

    const club = await Club.findOne({ userId });
    if (!club) throw createHttpError(404, "Club not found");

    club.coach = coachBonuses(coachType);
    await club.save();

    res.json({ club: club.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkName, createClub, getMyClub, updateCoach };
