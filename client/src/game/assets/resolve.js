import { assetManifest } from "./manifest";
import { loadAssetOverrides } from "./overrides";

function normalizeKey(s) {
  return String(s || "").trim();
}

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  return null;
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

