const { createHttpError } = require("../utils/createHttpError");
const { generateLogoSvg } = require("../services/aiLogoService");

const lastRequestByUser = new Map();

function nowMs() {
  return Date.now();
}

function getCooldownRemainingMs(userId, cooldownMs) {
  const last = lastRequestByUser.get(String(userId)) || 0;
  const diff = nowMs() - last;
  return diff >= cooldownMs ? 0 : cooldownMs - diff;
}

function markRequest(userId) {
  lastRequestByUser.set(String(userId), nowMs());
}

function isValidHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function normalizeMonogram(value) {
  const raw = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return null;
  return raw.slice(0, 3);
}

async function generateLogo(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const remaining = getCooldownRemainingMs(userId, 8000);
    if (remaining > 0) throw createHttpError(429, "Too many requests");
    markRequest(userId);

    const clubName = String(req.body.clubName || "").trim();
    const primary = String(req.body.primary || "").trim();
    const secondary = String(req.body.secondary || "").trim();
    const theme = String(req.body.theme || "night").trim();
    const style = String(req.body.style || "minimal").trim();
    const monogram = normalizeMonogram(req.body.monogram);

    if (clubName.length < 3) throw createHttpError(400, "Invalid club name");
    if (!isValidHex(primary) || !isValidHex(secondary)) throw createHttpError(400, "Invalid colors");
    if (!["night", "neon", "classic"].includes(theme)) throw createHttpError(400, "Invalid theme");
    if (!["minimal", "aggressive", "classic"].includes(style)) throw createHttpError(400, "Invalid style");

    const out = await generateLogoSvg({ clubName, primary, secondary, theme, style, monogram });
    res.json({ logo: out });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateLogo };
