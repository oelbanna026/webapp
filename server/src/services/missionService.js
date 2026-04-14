const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { creditCoins } = require("./coinService");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");

const MISSIONS = [
  { id: "win_3", type: "wins", target: 3, rewardCoins: 1200, rewardPacks: 1 },
  { id: "open_2", type: "packs", target: 2, rewardCoins: 800, rewardPacks: 0 },
];

function dayKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function ensureMissionDay(user, now = new Date()) {
  const key = dayKey(now);
  if (user.missionDay !== key) {
    user.missionDay = key;
    user.winsToday = 0;
    user.packsOpenedToday = 0;
    user.missionClaimedWin3 = false;
    user.missionClaimedOpen2 = false;
    return true;
  }
  return false;
}

function buildMissionView(user) {
  const wins = user.winsToday || 0;
  const packs = user.packsOpenedToday || 0;
  const views = [];
  for (const m of MISSIONS) {
    const progress = m.type === "wins" ? wins : packs;
    const claimed = m.id === "win_3" ? !!user.missionClaimedWin3 : !!user.missionClaimedOpen2;
    const complete = progress >= m.target;
    views.push({
      id: m.id,
      progress,
      target: m.target,
      complete,
      claimed,
      claimable: complete && !claimed,
      reward: { coins: m.rewardCoins, packs: m.rewardPacks },
    });
  }
  return views;
}

async function getMissions(userId) {
  const user = await User.findById(userId);
  if (!user) throw createHttpError(404, "User not found");
  let changed = false;
  changed = ensureMissionDay(user) || changed;
  if (changed) await user.save();
  return { day: user.missionDay, missions: buildMissionView(user) };
}

async function recordMatchWin(userId, session) {
  const q = User.findById(userId);
  const user = session ? await q.session(session) : await q;
  if (!user) return;
  const changed = ensureMissionDay(user) || false;
  user.winsToday = (user.winsToday || 0) + 1;
  if (session) await user.save({ session });
  else await user.save();
  return changed;
}

async function recordPackOpen(userId, session) {
  const q = User.findById(userId);
  const user = session ? await q.session(session) : await q;
  if (!user) return;
  const changed = ensureMissionDay(user) || false;
  user.packsOpenedToday = (user.packsOpenedToday || 0) + 1;
  user.packsOpenedTotal = (user.packsOpenedTotal || 0) + 1;
  if (session) await user.save({ session });
  else await user.save();
  return changed;
}

async function claimMission({ userId, missionId }) {
  return runWithOptionalTransaction(async (session) => {
    const q = User.findById(userId);
    const user = session ? await q.session(session) : await q;
    if (!user) throw createHttpError(404, "User not found");
    ensureMissionDay(user);

    if (!MISSIONS.some((m) => m.id === missionId)) throw createHttpError(400, "Invalid mission");

    const day = user.missionDay;
    if (missionId === "win_3") {
      if (user.missionClaimedWin3) throw createHttpError(409, "Mission already claimed");
      if ((user.winsToday || 0) < 3) throw createHttpError(409, "Mission not complete");
      user.missionClaimedWin3 = true;
      user.freePacks = (user.freePacks || 0) + 1;
      if (session) await user.save({ session });
      else await user.save();
      await creditCoins({ userId, amount: 1200, type: "MISSION_REWARD", idempotencyKey: `mission:${day}:win_3`, meta: { missionId } }, session);
    } else if (missionId === "open_2") {
      if (user.missionClaimedOpen2) throw createHttpError(409, "Mission already claimed");
      if ((user.packsOpenedToday || 0) < 2) throw createHttpError(409, "Mission not complete");
      user.missionClaimedOpen2 = true;
      if (session) await user.save({ session });
      else await user.save();
      await creditCoins({ userId, amount: 800, type: "MISSION_REWARD", idempotencyKey: `mission:${day}:open_2`, meta: { missionId } }, session);
    }

    const refreshed = session ? await User.findById(userId).session(session) : await User.findById(userId);
    return { day, missions: buildMissionView(refreshed || user), user: (refreshed || user).toPublicJSON() };
  });
}

module.exports = { getMissions, claimMission, recordMatchWin, recordPackOpen, MISSIONS };
