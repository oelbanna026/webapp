import { assetManifest } from "./manifest";
import { loadAssetOverrides } from "./overrides";

function normalizeKey(s) {
  return String(s || "").trim();
}

function slugify(s) {
  let out = String(s || "").trim();
  if (!out) return "";
  out = out.replace(/\s+/g, "-");
  try {
    out = out.replace(/[^\p{L}\p{N}-]+/gu, "");
  } catch {
    out = out.replace(/[^A-Za-z0-9\u0600-\u06FF-]+/g, "");
  }
  out = out.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return out.toLowerCase();
}

function getOverride(path) {
  const overrides = loadAssetOverrides();
  const parts = String(path || "").split(".").filter(Boolean);
  let cur = overrides;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : null;
}

export function resolveCardFrame(rarity) {
  const r = normalizeKey(rarity) || "common";
  return getOverride(`cards.frames.${r}`) || assetManifest.cards.frames[r] || assetManifest.cards.frames.common;
}

export function resolvePlayerPortrait(player) {
  const key = normalizeKey(player?.assets?.portraitKey);
  if (key) return getOverride(`players.portraits.${key}`) || assetManifest.players.portraits[key] || null;
  const tk = normalizeKey(player?.templateKey);
  if (!tk) return null;
  const keys = Object.keys(assetManifest.players.portraits || {});
  if (!keys.length) return null;
  let h = 2166136261;
  for (let i = 0; i < tk.length; i += 1) {
    h ^= tk.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % keys.length;
  const fallbackKey = keys[idx];
  return getOverride(`players.portraits.${fallbackKey}`) || assetManifest.players.portraits[fallbackKey] || null;
}

export function resolveClubLogo({ leagueKey = "egypt", teamName }) {
  const league = slugify(leagueKey);
  const team = slugify(teamName);
  const base = assetManifest.clubs.logos[league] || assetManifest.clubs.logos.egypt;
  return `${base}${team}.png`;
}

export function resolveKit({ leagueKey = "egypt", teamName, variant = "home" }) {
  const league = slugify(leagueKey);
  const team = slugify(teamName);
  const base = assetManifest.clubs.kits[league]?.[variant] || assetManifest.clubs.kits.egypt?.[variant] || `${assetManifest.base}/kits/`;
  return `${base}${team}.png`;
}
