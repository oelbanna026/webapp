const mongoose = require("mongoose");
const { Player } = require("../models/Player");
const { Squad } = require("../models/Squad");
const { createHttpError } = require("../utils/createHttpError");
const { POSITION_KEYS, FORMATIONS, calculateTeamRating, getFormationKeys, pickSlots } = require("../utils/squad");

function getPopulatePaths() {
  return POSITION_KEYS.map((k) => `slots.${k}`);
}

function toSquadDTO(squad) {
  if (!squad) return null;
  const slots = {};
  for (const key of POSITION_KEYS) {
    const v = squad.slots?.[key] || null;
    slots[key] = v && typeof v === "object" && v._id ? { ...v.toPublicJSON?.(), id: String(v._id) } : v;
  }
  return {
    id: String(squad._id),
    formation: squad.formation,
    rating: squad.rating,
    slots,
    updatedAt: squad.updatedAt,
  };
}

async function getMySquad(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const squad = await Squad.findOne({ userId }).populate(getPopulatePaths());
    res.json({ squad: toSquadDTO(squad) });
  } catch (err) {
    next(err);
  }
}

async function saveMySquad(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const formation = String(req.body.formation || "4-3-3");
    if (!FORMATIONS[formation]) throw createHttpError(400, "Invalid formation");

    const rawSlots = pickSlots(req.body.slots);
    const formationKeys = getFormationKeys(formation);
    const ids = formationKeys.map((k) => rawSlots[k]).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids.map(String)));
    if (uniqueIds.length !== ids.length) throw createHttpError(400, "Duplicate players are not allowed");

    const validIds = uniqueIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length !== uniqueIds.length) throw createHttpError(400, "Invalid player id in slots");

    const players = await Player.find({ _id: { $in: validIds } });
    if (players.length !== validIds.length) throw createHttpError(400, "One or more players not found");

    const rating = calculateTeamRating(players);

    const nextSlots = {};
    for (const key of POSITION_KEYS) {
      const value = rawSlots[key];
      nextSlots[key] = value ? new mongoose.Types.ObjectId(String(value)) : null;
    }

    const squad = await Squad.findOneAndUpdate(
      { userId },
      { $set: { formation, slots: nextSlots, rating } },
      { upsert: true, new: true }
    ).populate(getPopulatePaths());

    res.json({ squad: toSquadDTO(squad) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMySquad, saveMySquad };
