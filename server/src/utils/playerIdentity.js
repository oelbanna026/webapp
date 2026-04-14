const { findTemplateByKey } = require("./playerPool");

const FALLBACK_NATIONS = [
  "Morocco",
  "Egypt",
  "France",
  "Spain",
  "Brazil",
  "Argentina",
  "England",
  "Germany",
  "Italy",
  "Portugal",
  "Netherlands",
  "Nigeria",
  "Japan",
  "Korea",
  "Senegal",
  "Uruguay",
];

const FALLBACK_CLUBS = [
  "Stadium United",
  "Neon City",
  "Night Bowl FC",
  "Classic Park Rangers",
  "Metro Rovers",
  "Apex Athletic",
  "Quantum FC",
];

function hashString(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function fallbackIdentity(seed) {
  const h = Math.abs(hashString(seed));
  const nation = FALLBACK_NATIONS[h % FALLBACK_NATIONS.length];
  const clubName = FALLBACK_CLUBS[(h >> 3) % FALLBACK_CLUBS.length];
  return { nation, clubName };
}

function resolveIdentityForPlayer(player) {
  const currentNation = player.nation || null;
  const currentClub = player.clubName || null;
  if (currentNation && currentClub) return { nation: currentNation, clubName: currentClub, changed: false };

  const fromTemplate = player.templateKey ? findTemplateByKey(player.templateKey) : null;
  const nation = currentNation || fromTemplate?.nation || fallbackIdentity(player.templateKey || player.name || player._id).nation;
  const clubName = currentClub || fromTemplate?.clubName || fallbackIdentity(player.templateKey || player.name || player._id).clubName;
  const changed = nation !== currentNation || clubName !== currentClub;
  return { nation, clubName, changed };
}

async function ensureIdentityForPlayers(PlayerModel, players, session) {
  const ops = [];
  for (const p of players) {
    const { nation, clubName, changed } = resolveIdentityForPlayer(p);
    if (!changed) continue;
    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { nation, clubName } },
      },
    });
    p.nation = nation;
    p.clubName = clubName;
  }

  if (ops.length === 0) return 0;
  if (session) await PlayerModel.bulkWrite(ops, { session });
  else await PlayerModel.bulkWrite(ops);
  return ops.length;
}

module.exports = { resolveIdentityForPlayer, ensureIdentityForPlayers };

