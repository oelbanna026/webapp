const { Club } = require("../models/Club");
const { createHttpError } = require("../utils/createHttpError");
const { User } = require("../models/User");
const { creditCoins } = require("../services/coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");

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
          },
        ],
        session ? { session } : undefined
      );

      const u = session ? await User.findById(userId).session(session) : await User.findById(userId);
      if (!u) throw createHttpError(404, "User not found");
      u.starterPacks = (u.starterPacks || 0) + hookPacks;
      if (session) await u.save({ session });
      else await u.save();

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
