const { Club } = require("../models/Club");
const { Player } = require("../models/Player");
const { PlayerTemplate } = require("../models/PlayerTemplate");
const { getLeagueTeams } = require("../content/leagueRegistry");
const { invalidateTemplatePoolCache } = require("../services/templatePoolService");

function stableHash(str) {
  const s = String(str || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildNameMapping(oldNames, newNames) {
  const oldSorted = Array.from(new Set(oldNames.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
  const newSorted = Array.from(new Set(newNames.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
  const map = new Map();
  if (!newSorted.length) return map;
  for (let i = 0; i < oldSorted.length; i += 1) {
    map.set(oldSorted[i], newSorted[i % newSorted.length]);
  }
  return map;
}

async function migrateEgyptContent() {
  const leagueKey = "egypt";
  const teams = getLeagueTeams(leagueKey);
  const teamNames = teams.map((t) => t.team);
  const teamByName = new Map(teams.map((t) => [t.team, t]));
  const validTeamSet = new Set(teamNames);

  if (!teamNames.length) return { ok: true, clubs: 0, playerTemplates: 0, players: 0 };

  const templateOldNames = await PlayerTemplate.distinct("source.teamName", { "source.leagueKey": leagueKey });
  const templateOldClubs = await PlayerTemplate.distinct("clubName", { "source.leagueKey": leagueKey });
  const oldNames = [...templateOldNames, ...templateOldClubs].filter((n) => n && !validTeamSet.has(n));
  const mapping = buildNameMapping(oldNames, teamNames);

  const templateOps = [];
  for (const [from, to] of mapping.entries()) {
    templateOps.push({
      updateMany: {
        filter: { "source.leagueKey": leagueKey, "source.teamName": from },
        update: { $set: { "source.teamName": to, clubName: to } },
      },
    });
    templateOps.push({
      updateMany: {
        filter: { "source.leagueKey": leagueKey, clubName: from },
        update: { $set: { clubName: to } },
      },
    });
  }

  let playerTemplates = 0;
  if (templateOps.length) {
    const res = await PlayerTemplate.bulkWrite(templateOps, { ordered: false });
    playerTemplates = (res.modifiedCount || 0) + (res.upsertedCount || 0);
  }

  const playerOps = [];
  for (const [from, to] of mapping.entries()) {
    playerOps.push({
      updateMany: {
        filter: { clubName: from },
        update: { $set: { clubName: to } },
      },
    });
  }
  let players = 0;
  if (playerOps.length) {
    const res = await Player.bulkWrite(playerOps, { ordered: false });
    players = res.modifiedCount || 0;
  }

  const playersMissingAssets = await Player.find({
    templateKey: { $exists: true, $ne: null },
    $or: [{ assets: { $exists: false } }, { assets: null }, { position: { $exists: false } }, { position: null }],
  })
    .select({ _id: 1, templateKey: 1 })
    .limit(1500);

  let assetsUpdated = 0;
  if (playersMissingAssets.length) {
    const keys = Array.from(new Set(playersMissingAssets.map((p) => String(p.templateKey)).filter(Boolean)));
    const templates = await PlayerTemplate.find({ templateKey: { $in: keys } }).select({ templateKey: 1, assets: 1, position: 1 });
    const byKey = new Map(templates.map((t) => [String(t.templateKey), t]));
    const ops = [];
    for (const p of playersMissingAssets) {
      const t = byKey.get(String(p.templateKey));
      if (!t) continue;
      ops.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { assets: t.assets || null, position: t.position || null } },
        },
      });
    }
    if (ops.length) {
      const res = await Player.bulkWrite(ops, { ordered: false });
      assetsUpdated = res.modifiedCount || 0;
    }
  }

  const clubsToFix = await Club.find({
    $or: [{ affiliation: { $exists: false } }, { "affiliation.leagueKey": { $exists: false } }, { "affiliation.teamName": { $exists: false } }],
  }).select({ _id: 1, name: 1, userId: 1, affiliation: 1 });

  const clubOps = [];
  for (const c of clubsToFix) {
    const seed = `${c.userId || c._id}:${c.name}`;
    const idx = stableHash(seed) % teamNames.length;
    const teamName = teamNames[idx];
    const meta = teamByName.get(teamName);
    clubOps.push({
      updateOne: {
        filter: { _id: c._id },
        update: {
          $set: {
            affiliation: { leagueKey, teamName, tier: meta?.tier || null, style: meta?.style || null },
          },
        },
      },
    });
  }

  const clubsWithInvalidTeam = await Club.find({
    "affiliation.leagueKey": leagueKey,
    "affiliation.teamName": { $exists: true, $ne: null },
  }).select({ _id: 1, name: 1, userId: 1, affiliation: 1 });

  for (const c of clubsWithInvalidTeam) {
    const current = String(c.affiliation?.teamName || "");
    let next = current;
    if (!validTeamSet.has(current)) {
      next = mapping.get(current) || teamNames[stableHash(`${c._id}`) % teamNames.length];
    }
    const meta = teamByName.get(next);
    clubOps.push({
      updateOne: {
        filter: { _id: c._id },
        update: { $set: { "affiliation.teamName": next, "affiliation.tier": meta?.tier || null, "affiliation.style": meta?.style || null, "affiliation.leagueKey": leagueKey } },
      },
    });
  }

  let clubs = 0;
  if (clubOps.length) {
    const res = await Club.bulkWrite(clubOps, { ordered: false });
    clubs = res.modifiedCount || 0;
  }

  if (clubs || playerTemplates || players || assetsUpdated) await invalidateTemplatePoolCache();
  return { ok: true, clubs, playerTemplates, players, assetsUpdated };
}

module.exports = { migrateEgyptContent };
