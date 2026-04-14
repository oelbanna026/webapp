const { Player } = require("../models/Player");

function stats(pace, shooting, passing, defense) {
  return { pace, shooting, passing, defense };
}

async function ensurePlayersSeeded() {
  const count = await Player.countDocuments();
  if (count > 0) return;

  const players = [
    { name: "Nova Striker", rating: 91, rarity: "legendary", stats: stats(94, 93, 86, 52) },
    { name: "Apex Winger", rating: 88, rarity: "epic", stats: stats(93, 84, 82, 58) },
    { name: "Orbit Playmaker", rating: 89, rarity: "epic", stats: stats(82, 80, 92, 70) },
    { name: "Ion Finisher", rating: 86, rarity: "rare", stats: stats(90, 87, 76, 48) },
    { name: "Pulse Engine", rating: 87, rarity: "rare", stats: stats(84, 78, 86, 82) },
    { name: "Grid Sentinel", rating: 88, rarity: "epic", stats: stats(78, 60, 76, 94) },
    { name: "Neon Centerback", rating: 85, rarity: "rare", stats: stats(72, 52, 68, 90) },
    { name: "Carbon Wall", rating: 84, rarity: "common", stats: stats(70, 50, 66, 88) },
    { name: "Arc Fullback", rating: 83, rarity: "common", stats: stats(86, 58, 74, 78) },
    { name: "Vector Keeper", rating: 86, rarity: "rare", stats: stats(64, 45, 62, 92) },
    { name: "Signal Winger", rating: 82, rarity: "common", stats: stats(88, 74, 70, 54) },
    { name: "Phase Midfielder", rating: 81, rarity: "common", stats: stats(78, 69, 82, 74) },
    { name: "Kinetic Box-to-Box", rating: 85, rarity: "rare", stats: stats(83, 74, 80, 80) },
    { name: "Stadium Anchor", rating: 84, rarity: "common", stats: stats(76, 66, 74, 84) },
    { name: "Quantum Poacher", rating: 83, rarity: "common", stats: stats(84, 82, 66, 46) },
    { name: "Lime Destroyer", rating: 86, rarity: "rare", stats: stats(80, 70, 78, 88) },
    { name: "Edge Controller", rating: 87, rarity: "epic", stats: stats(79, 76, 90, 78) },
    { name: "Drift Winger", rating: 85, rarity: "rare", stats: stats(92, 78, 76, 55) },
  ];

  await Player.insertMany(players);
}

module.exports = { ensurePlayersSeeded };

