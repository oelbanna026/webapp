const { createHttpError } = require("./createHttpError");
const { getFormationKeys } = require("./squad");

const LINES = {
  "4-3-3": {
    attack: ["LW", "ST", "RW"],
    midfield: ["LCM", "CM", "RCM"],
    defense: ["LB", "LCB", "RCB", "RB", "GK"],
  },
  "4-4-2": {
    attack: ["ST", "ST2"],
    midfield: ["LM", "LCM", "RCM", "RM"],
    defense: ["LB", "LCB", "RCB", "RB", "GK"],
  },
};

const DEF_KEYS = new Set(["GK", "LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"]);
const ATT_KEYS = new Set(["LW", "RW", "ST", "ST2"]);

function buildLineMap(keys) {
  const defense = [];
  const midfield = [];
  const attack = [];
  for (const k of keys) {
    if (DEF_KEYS.has(k)) defense.push(k);
    else if (ATT_KEYS.has(k)) attack.push(k);
    else midfield.push(k);
  }
  return { attack, midfield, defense };
}

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function avg(values) {
  const list = values.filter((v) => Number.isFinite(v));
  if (list.length === 0) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function playerLineScore(player, line) {
  const s = player.stats || {};
  const pace = clampScore(s.pace);
  const shooting = clampScore(s.shooting);
  const passing = clampScore(s.passing);
  const defense = clampScore(s.defense);

  if (line === "attack") return clampScore(shooting * 0.6 + pace * 0.4);
  if (line === "midfield") return clampScore(passing * 0.6 + pace * 0.2 + shooting * 0.2);
  return clampScore(defense * 0.7 + pace * 0.3);
}

function computeChemistry(players) {
  const list = (players || []).filter(Boolean);
  const n = list.length;
  if (n < 2) return { chemistryScore: 0, chemistryBonus: 0 };

  let score = 0;
  let max = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = list[i];
      const b = list[j];
      max += 3;
      if (a.clubName && b.clubName && a.clubName === b.clubName) score += 2;
      if (a.nation && b.nation && a.nation === b.nation) score += 1;
    }
  }
  const chemistryScore = max > 0 ? Math.round((score / max) * 100) : 0;
  const chemistryBonus = Math.round((chemistryScore / 100) * 6);
  return { chemistryScore, chemistryBonus };
}

function computeTeamPower({ formation, slots, playersById, coach }) {
  const keys = getFormationKeys(formation);
  const assigned = keys.map((k) => slots[k]).filter(Boolean);
  if (assigned.length < 7) throw createHttpError(409, "Assign at least 7 players to start a match");

  const lineMap = LINES[formation] || buildLineMap(keys);

  const lineScores = {
    attack: avg(lineMap.attack.map((k) => (playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "attack") : null))),
    midfield: avg(
      lineMap.midfield.map((k) => (playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "midfield") : null))
    ),
    defense: avg(lineMap.defense.map((k) => (playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "defense") : null))),
  };

  const coachBonus =
    (coach?.bonusAttack || 0) + (coach?.bonusDefense || 0) + (coach?.bonusAll || 0);

  const assignedPlayers = assigned.map((id) => playersById[String(id)]).filter(Boolean);
  const { chemistryScore, chemistryBonus } = computeChemistry(assignedPlayers);

  const teamPower = lineScores.attack + lineScores.midfield + lineScores.defense + coachBonus + chemistryBonus;

  return {
    formation,
    coachBonus,
    chemistryScore,
    chemistryBonus,
    attack: Math.round(lineScores.attack),
    midfield: Math.round(lineScores.midfield),
    defense: Math.round(lineScores.defense),
    teamPower: Math.round(teamPower),
    squadPlayerIds: assigned,
  };
}

module.exports = { computeTeamPower };
