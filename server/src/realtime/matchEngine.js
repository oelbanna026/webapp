const mongoose = require("mongoose");
const { Club } = require("../models/Club");
const { Player } = require("../models/Player");
const { Squad } = require("../models/Squad");
const { createHttpError } = require("../utils/createHttpError");
const { computeTeamPower } = require("../utils/teamPower");
const { FORMATIONS, getFormationKeys } = require("../utils/squad");
const { ensureIdentityForPlayers } = require("../utils/playerIdentity");

function nowMs() {
  return Date.now();
}

function clampInt(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function xorshift32(seed) {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function makeId(prefix = "m") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function normalizeTactics(t) {
  const formation = t?.formation && FORMATIONS[t.formation] ? t.formation : "4-3-3";
  const playstyle = ["attacking", "balanced", "defensive"].includes(t?.playstyle) ? t.playstyle : "balanced";
  const pressing = clampInt(t?.pressing, { min: 0, max: 100 });
  const lineHeight = clampInt(t?.lineHeight, { min: 0, max: 100 });
  const counter = !!t?.counter;
  return { formation, playstyle, pressing, lineHeight, counter };
}

function staminaDrainPerSecond({ pressing, lineHeight, playstyle }) {
  const press = pressing / 100;
  const line = lineHeight / 100;
  const style = playstyle === "attacking" ? 1.08 : playstyle === "defensive" ? 0.95 : 1;
  const base = 0.35 + press * 0.45 + line * 0.25;
  return base * style;
}

function fatigueMultiplier(stamina) {
  const s = Math.max(0, Math.min(100, Number(stamina) || 0));
  if (s >= 70) return 1;
  if (s >= 40) return 0.92 + ((s - 40) / 30) * 0.08;
  return 0.75 + (s / 40) * 0.17;
}

function tacticalEfficiency(t, opp) {
  const press = (t.pressing - 50) / 50;
  const line = (t.lineHeight - 50) / 50;
  const counter = t.counter ? 1 : -0.5;
  const style = t.playstyle === "attacking" ? 0.6 : t.playstyle === "defensive" ? -0.2 : 0.2;

  const oppPress = (opp.pressing - 50) / 50;
  const oppLine = (opp.lineHeight - 50) / 50;
  const vsPress = press - oppPress;
  const vsLine = line - oppLine;

  const raw = style + counter * 0.15 + vsPress * 0.25 + vsLine * 0.2;
  return Math.max(-1, Math.min(1, raw));
}

function strengthVector(team) {
  return {
    attack: Number(team.breakdown.attack) || 0,
    midfield: Number(team.breakdown.midfield) || 0,
    defense: Number(team.breakdown.defense) || 0,
  };
}

function teamStrengthScore(team) {
  const v = strengthVector(team);
  const base = v.attack * 0.42 + v.midfield * 0.33 + v.defense * 0.25;
  const staminaAvg = team.lineup.reduce((acc, p) => acc + (team.stamina[String(p._id)] ?? 100), 0) / Math.max(1, team.lineup.length);
  return base * fatigueMultiplier(staminaAvg);
}

function computeWinProb({ homeStrength, awayStrength, homeEff, awayEff, rand }) {
  const sDiff = (homeStrength - awayStrength) / 25;
  const tDiff = (homeEff - awayEff);
  const controlledRand = (rand - 0.5) * 0.35;
  const score = 0.4 * sDiff + 0.6 * tDiff + controlledRand;
  const p = 1 / (1 + Math.exp(-score * 2.6));
  return Math.max(0.05, Math.min(0.95, p));
}

function initialPositions(keys) {
  const positions = {};
  const xByLine = {
    GK: 0.08,
    DEF: 0.28,
    MID: 0.5,
    ATT: 0.72,
  };
  const ORDER = {
    DEF: ["LWB", "LB", "LCB", "CB", "RCB", "RB", "RWB"],
    MID: ["LM", "LAM", "LCM", "LDM", "CDM", "CM", "CAM", "RDM", "RCM", "RAM", "RM"],
    ATT: ["LW", "ST", "ST2", "RW"],
  };

  const list = Array.isArray(keys) ? keys : [];
  const gk = list.filter((k) => k === "GK");
  const def = ORDER.DEF.filter((k) => list.includes(k));
  const mid = ORDER.MID.filter((k) => list.includes(k));
  const att = ORDER.ATT.filter((k) => list.includes(k));
  const other = list.filter((k) => !gk.includes(k) && !def.includes(k) && !mid.includes(k) && !att.includes(k));

  const placeLine = (line, ks) => {
    const n = ks.length;
    for (let i = 0; i < n; i += 1) {
      const y = n <= 1 ? 0.5 : 0.18 + (i / (n - 1)) * 0.64;
      positions[ks[i]] = { x: xByLine[line], y };
    }
  };

  for (const k of gk) positions[k] = { x: xByLine.GK, y: 0.5 };
  placeLine("DEF", def);
  placeLine("MID", mid);
  placeLine("ATT", att);
  for (const k of other) positions[k] = { x: 0.5, y: 0.5 };
  return positions;
}

function mirrorPositions(pos) {
  const out = {};
  for (const [k, v] of Object.entries(pos || {})) out[k] = { x: 1 - v.x, y: v.y };
  return out;
}

function roleForKey(k) {
  const key = String(k || "");
  if (key === "GK") return "GK";
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(key)) return "DEF";
  if (["LM", "LCM", "CM", "RCM", "RM", "LDM", "CDM", "RDM", "LAM", "CAM", "RAM"].includes(key)) return "MID";
  if (["LW", "ST", "ST2", "RW"].includes(key)) return "ATT";
  return "MID";
}

function lineCounts(slotKeys) {
  const counts = { DEF: 0, MID: 0, ATT: 0 };
  for (const k of slotKeys || []) {
    const r = roleForKey(k);
    if (r === "DEF") counts.DEF += 1;
    else if (r === "ATT") counts.ATT += 1;
    else if (r !== "GK") counts.MID += 1;
  }
  return counts;
}

function numberForSlotKey(k, counts) {
  const r = roleForKey(k);
  if (r === "GK") return 1;
  const def = counts?.DEF || 0;
  const mid = counts?.MID || 0;
  if (r === "DEF") {
    const idx = (counts.__d = (counts.__d || 0) + 1);
    return 1 + idx;
  }
  if (r === "MID") {
    const idx = (counts.__m = (counts.__m || 0) + 1);
    return 1 + def + idx;
  }
  const idx = (counts.__a = (counts.__a || 0) + 1);
  return 1 + def + mid + idx;
}

function updateTeamPositions({ team, side, ball, possession }) {
  const isHome = side === "home";
  const isAttacking = possession === side;
  const base = team.basePositions;

  const lineShift = ((team.tactics.lineHeight - 50) / 50) * 0.08;
  const styleShift = team.tactics.playstyle === "attacking" ? 0.06 : team.tactics.playstyle === "defensive" ? -0.05 : 0;
  const counterShift = team.tactics.counter ? 0.02 : 0;
  const press = team.tactics.pressing / 100;
  const ballPull = (!isAttacking ? 0.12 + press * 0.16 : 0.06);

  for (const key of team.slotKeys) {
    const b = base[key] || { x: 0.5, y: 0.5 };
    let tx = b.x;
    let ty = b.y;

    if (isAttacking) {
      tx += (isHome ? 1 : -1) * (styleShift + counterShift);
    } else {
      tx -= (isHome ? 1 : -1) * (styleShift * 0.6);
    }

    tx += (isHome ? lineShift : -lineShift);
    tx = Math.max(0.06, Math.min(0.94, tx));

    tx += (ball.x - tx) * ballPull;
    ty += (ball.y - ty) * (0.08 + press * 0.12);
    ty = Math.max(0.08, Math.min(0.92, ty));

    const cur = team.positions[key] || b;
    team.positions[key] = {
      x: cur.x + (tx - cur.x) * 0.14,
      y: cur.y + (ty - cur.y) * 0.14,
    };
  }
}

async function loadTeamSnapshot({ userId }) {
  if (!mongoose.isValidObjectId(userId)) throw createHttpError(400, "Invalid user");

  const [club, squad] = await Promise.all([Club.findOne({ userId }), Squad.findOne({ userId })]);
  if (!club) throw createHttpError(409, "Create a club first");
  if (!squad) throw createHttpError(409, "Create a squad first");

  const formation = String(squad.formation || "4-3-3");
  const keys = getFormationKeys(formation);
  const ids = keys.map((k) => squad.slots?.[k]).filter(Boolean).map(String);
  if (ids.length < keys.length) throw createHttpError(409, "Complete your starting XI first");
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length !== ids.length) throw createHttpError(409, "Invalid squad (duplicate players)");

  const players = await Player.find({ _id: { $in: uniqueIds } });
  if (players.length !== uniqueIds.length) throw createHttpError(409, "Squad contains missing players");
  await ensureIdentityForPlayers(Player, players);

  const playersById = Object.fromEntries(players.map((p) => [String(p._id), p]));
  const slots = {};
  for (const key of keys) slots[key] = squad.slots?.[key] ? String(squad.slots[key]) : null;

  const breakdown = computeTeamPower({ formation, slots, playersById, coach: club.coach });
  const lineup = breakdown.squadPlayerIds.map((id) => playersById[String(id)]).filter(Boolean);
  const slotKeys = keys.filter((k) => !!slots[k]);

  const bench = await Player.find({ ownerId: userId, _id: { $nin: lineup.map((p) => p._id) } })
    .sort({ rating: -1, rarity: -1, name: 1 })
    .limit(6);
  await ensureIdentityForPlayers(Player, bench);

  const stamina = {};
  for (const p of lineup) stamina[String(p._id)] = 100;
  for (const p of bench) stamina[String(p._id)] = 100;

  const tactics = normalizeTactics({
    formation,
    playstyle: club.coach?.type || "balanced",
    pressing: 70,
    lineHeight: 55,
    counter: true,
  });

  return {
    userId: String(userId),
    club: { name: club.name, theme: club.theme, stadium: club.stadium },
    breakdown,
    coach: club.coach,
    tactics,
    lineup,
    bench,
    stamina,
    slotKeys,
  };
}

function publicPlayer(p, stamina) {
  return {
    id: String(p._id),
    name: p.name,
    rating: p.rating,
    rarity: p.rarity,
    nation: p.nation ?? null,
    clubName: p.clubName ?? null,
    stamina: clampInt(stamina, { min: 0, max: 100 }),
  };
}

function toPublicMatch(match) {
  const timeSec = clampInt(match.timeSec, { min: 0, max: 90 });
  const homeCounts = { ...lineCounts(match.home.slotKeys) };
  const awayCounts = { ...lineCounts(match.away.slotKeys) };
  return {
    id: match.id,
    status: match.status,
    teams: {
      home: { userId: match.home.userId, clubName: match.home.club?.name || "Home" },
      away: { userId: match.away.userId, clubName: match.away.club?.name || "Away" },
    },
    timeSec,
    clock: `${timeSec}:${String(0).padStart(2, "0")}`,
    score: match.score,
    possession: match.possession,
    ball: match.ball,
    positions: {
      home: match.home.slotKeys.map((k, idx) => ({
        slotKey: k,
        number: numberForSlotKey(k, homeCounts),
        playerId: match.home.lineup[idx] ? String(match.home.lineup[idx]._id) : null,
        x: match.home.positions[k]?.x ?? 0.5,
        y: match.home.positions[k]?.y ?? 0.5,
      })),
      away: match.away.slotKeys.map((k, idx) => ({
        slotKey: k,
        number: numberForSlotKey(k, awayCounts),
        playerId: match.away.lineup[idx] ? String(match.away.lineup[idx]._id) : null,
        x: match.away.positions[k]?.x ?? 0.5,
        y: match.away.positions[k]?.y ?? 0.5,
      })),
    },
    tactics: { home: match.home.tactics, away: match.away.tactics },
    attributes: {
      home: { attack: match.home.breakdown.attack, midfield: match.home.breakdown.midfield, defense: match.home.breakdown.defense, stamina: match.home.staminaAvg },
      away: { attack: match.away.breakdown.attack, midfield: match.away.breakdown.midfield, defense: match.away.breakdown.defense, stamina: match.away.staminaAvg },
    },
    lineup: {
      home: match.home.lineup.map((p) => publicPlayer(p, match.home.stamina[String(p._id)])),
      away: match.away.lineup.map((p) => publicPlayer(p, match.away.stamina[String(p._id)])),
    },
    bench: {
      home: match.home.bench.map((p) => publicPlayer(p, match.home.stamina[String(p._id)])),
      away: match.away.bench.map((p) => publicPlayer(p, match.away.stamina[String(p._id)])),
    },
    events: match.events.slice(-20),
  };
}

function computeTacticalFrame({ match, rng }) {
  const homeStrength = teamStrengthScore(match.home);
  const awayStrength = teamStrengthScore(match.away);
  const homeEff = tacticalEfficiency(match.home.tactics, match.away.tactics);
  const awayEff = tacticalEfficiency(match.away.tactics, match.home.tactics);
  const pHome = computeWinProb({ homeStrength, awayStrength, homeEff, awayEff, rand: rng() });
  return { homeStrength, awayStrength, homeEff, awayEff, pHome };
}

function driftBall({ ball, targetX, targetY, speed, rng }) {
  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const dist = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / dist;
  const ny = dy / dist;
  const jitter = (rng() - 0.5) * 0.06;
  ball.x = Math.max(0.02, Math.min(0.98, ball.x + nx * speed + jitter));
  ball.y = Math.max(0.05, Math.min(0.95, ball.y + ny * speed + (rng() - 0.5) * 0.03));
}

function pushEvent(match, event) {
  match.events.push(event);
  if (match.events.length > 200) match.events.splice(0, match.events.length - 200);
}

function tickMatch(match) {
  if (match.status !== "live") return;
  const rng = match.rng;
  match.timeSec += 1;
  if (match.timeSec >= 90) {
    match.status = "completed";
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "full_time", team: null });
    return;
  }

  const homeDrain = staminaDrainPerSecond(match.home.tactics);
  const awayDrain = staminaDrainPerSecond(match.away.tactics);

  for (const p of match.home.lineup) match.home.stamina[String(p._id)] = Math.max(0, (match.home.stamina[String(p._id)] ?? 100) - homeDrain);
  for (const p of match.away.lineup) match.away.stamina[String(p._id)] = Math.max(0, (match.away.stamina[String(p._id)] ?? 100) - awayDrain);

  match.home.staminaAvg = Math.round(match.home.lineup.reduce((acc, p) => acc + (match.home.stamina[String(p._id)] ?? 100), 0) / Math.max(1, match.home.lineup.length));
  match.away.staminaAvg = Math.round(match.away.lineup.reduce((acc, p) => acc + (match.away.stamina[String(p._id)] ?? 100), 0) / Math.max(1, match.away.lineup.length));

  const frame = computeTacticalFrame({ match, rng });
  const attackingTeam = match.possession === "home" ? match.home : match.away;
  const defendingTeam = match.possession === "home" ? match.away : match.home;
  const teamKey = match.possession;

  const attackingBias = teamKey === "home" ? frame.pHome : 1 - frame.pHome;
  const attackSkill = teamStrengthScore(attackingTeam);
  const defendSkill = teamStrengthScore(defendingTeam);
  const skillEdge = (attackSkill - defendSkill) / 30;

  const inFinalThird = teamKey === "home" ? match.ball.x > 0.63 : match.ball.x < 0.37;
  const shotChance = (inFinalThird ? 0.22 : 0.08) + skillEdge * 0.06 + (attackingTeam.tactics.playstyle === "attacking" ? 0.06 : 0);
  const passChance = 0.66 - (attackingTeam.tactics.playstyle === "attacking" ? 0.08 : 0) + (attackingTeam.tactics.counter ? -0.04 : 0);
  const actionRoll = rng();

  if (actionRoll < shotChance) {
    const baseGoal = 0.12 + skillEdge * 0.08 + (attackingBias - 0.5) * 0.05;
    const fatigue = fatigueMultiplier(attackingTeam.staminaAvg);
    const goalProb = Math.max(0.03, Math.min(0.55, baseGoal * fatigue));
    const isGoal = rng() < goalProb;
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "shot", team: teamKey, x: match.ball.x, y: match.ball.y, p: Number(goalProb.toFixed(3)) });
    if (isGoal) {
      match.score[teamKey] += 1;
      pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "goal", team: teamKey, score: { ...match.score } });
      match.ball.x = 0.5;
      match.ball.y = 0.5;
      match.possession = teamKey === "home" ? "away" : "home";
      updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
      updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
      return;
    }
    match.possession = rng() < 0.55 ? teamKey : teamKey === "home" ? "away" : "home";
    updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
    updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
    return;
  }

  if (actionRoll < shotChance + passChance) {
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "pass", team: teamKey, x: match.ball.x, y: match.ball.y });
    const targetX = teamKey === "home" ? 0.85 : 0.15;
    const speed = 0.06 + (attackingTeam.tactics.counter ? 0.02 : 0);
    driftBall({ ball: match.ball, targetX, targetY: 0.5 + (rng() - 0.5) * 0.25, speed, rng });
    if (rng() < 0.18 + (defendingTeam.tactics.pressing / 100) * 0.2) {
      match.possession = teamKey === "home" ? "away" : "home";
      pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "interception", team: match.possession, x: match.ball.x, y: match.ball.y });
    }
    updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
    updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
    return;
  }

  const duelProb = 0.25 + (defendingTeam.tactics.pressing / 100) * 0.25 + (defendingTeam.tactics.playstyle === "defensive" ? 0.06 : 0);
  if (rng() < duelProb) {
    const successProb = Math.max(0.15, Math.min(0.85, 0.55 - skillEdge * 0.08 + (defendingTeam.tactics.pressing - attackingTeam.tactics.pressing) / 200));
    const tackleSuccess = rng() < successProb;
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "tackle", team: teamKey === "home" ? "away" : "home", p: Number(successProb.toFixed(3)) });
    if (tackleSuccess) {
      match.possession = teamKey === "home" ? "away" : "home";
      driftBall({ ball: match.ball, targetX: match.possession === "home" ? 0.45 : 0.55, targetY: 0.5, speed: 0.04, rng });
    }
    updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
    updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
    return;
  }

  const driftTargetX = teamKey === "home" ? 0.72 : 0.28;
  driftBall({ ball: match.ball, targetX: driftTargetX, targetY: 0.5, speed: 0.025, rng });
  updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
  updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
}

function recalcTeamBreakdown(team) {
  const formation = String(team.tactics?.formation || "4-3-3");
  const keys = getFormationKeys(formation);
  const slots = {};
  const playersById = {};
  for (let i = 0; i < keys.length; i += 1) {
    const p = team.lineup[i];
    if (!p) continue;
    const id = String(p._id);
    slots[keys[i]] = id;
    playersById[id] = p;
  }
  team.breakdown = computeTeamPower({ formation, slots, playersById, coach: team.coach });
  team.slotKeys = keys;
}

function applyFormationToTeam({ team, side, formation }) {
  const oldKeys = Array.isArray(team.slotKeys) ? team.slotKeys : [];
  const newKeys = getFormationKeys(formation);
  const base = initialPositions(newKeys);
  const oriented = side === "home" ? base : mirrorPositions(base);
  const nextPositions = {};
  for (let i = 0; i < newKeys.length; i += 1) {
    const nk = newKeys[i];
    const ok = oldKeys[i];
    nextPositions[nk] = (ok && team.positions?.[ok]) || oriented[nk] || { x: 0.5, y: 0.5 };
  }
  team.slotKeys = newKeys;
  team.basePositions = oriented;
  team.positions = nextPositions;
}

function createMatch({ home, away }) {
  const seed = (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0;
  const rng = xorshift32(seed);
  const homeBase = initialPositions(home.slotKeys);
  const awayBase = mirrorPositions(initialPositions(away.slotKeys));
  return {
    id: makeId("match"),
    status: "live",
    createdAt: new Date().toISOString(),
    timeSec: 0,
    score: { home: 0, away: 0 },
    possession: rng() < 0.5 ? "home" : "away",
    ball: { x: 0.5, y: 0.5 },
    rng,
    seed,
    events: [{ id: makeId("e"), t: 0, type: "kickoff", team: null }],
    home: { ...home, staminaAvg: 100, basePositions: homeBase, positions: { ...homeBase } },
    away: { ...away, staminaAvg: 100, basePositions: awayBase, positions: { ...awayBase } },
  };
}

function attachMatchEngine({ tickMs = 1000, sendToUsers }) {
  const queue = [];
  const matches = new Map();
  const sessionByUserId = new Map();

  function getSession(userId) {
    return sessionByUserId.get(String(userId)) || null;
  }

  function removeFromQueue(userId) {
    const idx = queue.findIndex((u) => String(u.userId) === String(userId));
    if (idx >= 0) queue.splice(idx, 1);
  }

  async function queueUser({ userId, ws }) {
    const uid = String(userId);
    removeFromQueue(uid);
    queue.push({ userId: uid, ws, joinedAt: nowMs() });

    while (queue.length >= 2) {
      const a = queue.shift();
      const b = queue.shift();
      if (!a?.ws || !b?.ws) continue;
      const [home, away] = await Promise.all([loadTeamSnapshot({ userId: a.userId }), loadTeamSnapshot({ userId: b.userId })]);
      const match = createMatch({ home, away });
      matches.set(match.id, match);
      sessionByUserId.set(home.userId, { matchId: match.id, side: "home" });
      sessionByUserId.set(away.userId, { matchId: match.id, side: "away" });
      sendToUsers([home.userId, away.userId], { type: "match.start", match: toPublicMatch(match) });
    }
  }

  function leave({ userId }) {
    const uid = String(userId);
    removeFromQueue(uid);
    const session = getSession(uid);
    if (!session) return;
    const match = matches.get(session.matchId);
    if (!match) {
      sessionByUserId.delete(uid);
      return;
    }
    match.status = "completed";
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "abandoned", team: session.side });
    sendToUsers([match.home.userId, match.away.userId], { type: "match.end", match: toPublicMatch(match) });
    sessionByUserId.delete(match.home.userId);
    sessionByUserId.delete(match.away.userId);
    matches.delete(match.id);
  }

  function setTactics({ userId, tactics }) {
    const session = getSession(userId);
    if (!session) return;
    const match = matches.get(session.matchId);
    if (!match || match.status !== "live") return;
    const team = session.side === "home" ? match.home : match.away;
    const next = normalizeTactics({ ...team.tactics, ...tactics });
    const changedFormation = next.formation !== team.tactics.formation;
    team.tactics = next;
    if (changedFormation) {
      applyFormationToTeam({ team, side: session.side, formation: next.formation });
      recalcTeamBreakdown(team);
    }
    sendToUsers([match.home.userId, match.away.userId], { type: "match.tactics", side: session.side, tactics: team.tactics });
  }

  function substitute({ userId, outPlayerId, inPlayerId }) {
    const session = getSession(userId);
    if (!session) return;
    const match = matches.get(session.matchId);
    if (!match || match.status !== "live") return;
    const team = session.side === "home" ? match.home : match.away;
    const outIdx = team.lineup.findIndex((p) => String(p._id) === String(outPlayerId));
    const inIdx = team.bench.findIndex((p) => String(p._id) === String(inPlayerId));
    if (outIdx < 0 || inIdx < 0) return;

    const outP = team.lineup[outIdx];
    const inP = team.bench[inIdx];
    team.lineup[outIdx] = inP;
    team.bench[inIdx] = outP;
    team.stamina[String(inP._id)] = Math.max(80, team.stamina[String(inP._id)] ?? 100);
    pushEvent(match, { id: makeId("e"), t: match.timeSec, type: "substitution", team: session.side, outPlayerId: String(outP._id), inPlayerId: String(inP._id) });
    recalcTeamBreakdown(team);
    updateTeamPositions({ team: match.home, side: "home", ball: match.ball, possession: match.possession });
    updateTeamPositions({ team: match.away, side: "away", ball: match.ball, possession: match.possession });
    sendToUsers([match.home.userId, match.away.userId], { type: "match.tick", match: toPublicMatch(match) });
  }

  const interval = setInterval(() => {
    for (const match of matches.values()) {
      if (match.status !== "live") continue;
      tickMatch(match);
      sendToUsers([match.home.userId, match.away.userId], { type: "match.tick", match: toPublicMatch(match) });
      if (match.status === "completed") {
        sendToUsers([match.home.userId, match.away.userId], { type: "match.end", match: toPublicMatch(match) });
        sessionByUserId.delete(match.home.userId);
        sessionByUserId.delete(match.away.userId);
        matches.delete(match.id);
      }
    }
  }, tickMs);

  return {
    queueUser,
    leave,
    setTactics,
    substitute,
    close() {
      clearInterval(interval);
      queue.length = 0;
      matches.clear();
      sessionByUserId.clear();
    },
  };
}

module.exports = { attachMatchEngine };
