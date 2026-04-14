const POSITION_KEYS = [
  "GK",
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "RWB",
  "LDM",
  "CDM",
  "RDM",
  "LM",
  "LCM",
  "CM",
  "RCM",
  "RM",
  "LAM",
  "CAM",
  "RAM",
  "LW",
  "ST",
  "RW",
  "ST2",
];

const FORMATIONS = {
  "4-3-3": ["GK", "LB", "LCB", "RCB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "RCM", "RM", "ST", "ST2"],
  "4-2-3-1": ["GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LAM", "CAM", "RAM", "ST"],
  "4-1-2-1-2": ["GK", "LB", "LCB", "RCB", "RB", "CDM", "LCM", "RCM", "CAM", "ST", "ST2"],
  "4-5-1": ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "CM", "RCM", "RM", "ST"],
  "3-4-3": ["GK", "LCB", "CB", "RCB", "LM", "LCM", "RCM", "RM", "LW", "ST", "RW"],
  "3-5-2": ["GK", "LCB", "CB", "RCB", "LM", "LCM", "CM", "RCM", "RM", "ST", "ST2"],
  "5-3-2": ["GK", "LWB", "LCB", "CB", "RCB", "RWB", "LCM", "CM", "RCM", "ST", "ST2"],
};

function getFormationKeys(formation) {
  return FORMATIONS[formation] || FORMATIONS["4-3-3"];
}

function pickSlots(input) {
  const slots = {};
  for (const key of POSITION_KEYS) {
    slots[key] = input && Object.prototype.hasOwnProperty.call(input, key) ? input[key] : null;
  }
  return slots;
}

function calculateTeamRating(players) {
  const list = Array.isArray(players) ? players : [];
  const rated = list.filter((p) => p && Number.isFinite(p.rating));
  if (rated.length === 0) return 0;
  const sum = rated.reduce((acc, p) => acc + p.rating, 0);
  return Math.round(sum / rated.length);
}

module.exports = { POSITION_KEYS, FORMATIONS, getFormationKeys, pickSlots, calculateTeamRating };
