function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PLAYER_POOL = [
  { name: "Rust Runner", rating: 74, rarity: "common", nation: "Morocco", clubName: "Stadium United", stats: { pace: 82, shooting: 62, passing: 66, defense: 54 } },
  { name: "Midnight Dribbler", rating: 76, rarity: "common", nation: "France", clubName: "Night Bowl FC", stats: { pace: 84, shooting: 64, passing: 68, defense: 55 } },
  { name: "Circuit Winger", rating: 78, rarity: "common", nation: "Brazil", clubName: "Neon City", stats: { pace: 88, shooting: 66, passing: 70, defense: 56 } },
  { name: "Chrome Fullback", rating: 77, rarity: "common", nation: "Spain", clubName: "Classic Park Rangers", stats: { pace: 80, shooting: 54, passing: 68, defense: 74 } },
  { name: "Stadium Anchor", rating: 80, rarity: "common", nation: "Germany", clubName: "Stadium United", stats: { pace: 74, shooting: 62, passing: 72, defense: 78 } },
  { name: "Neon Poacher", rating: 79, rarity: "common", nation: "Argentina", clubName: "Neon City", stats: { pace: 80, shooting: 78, passing: 62, defense: 48 } },
  { name: "Grid Midfielder", rating: 75, rarity: "common", nation: "England", clubName: "Classic Park Rangers", stats: { pace: 76, shooting: 64, passing: 74, defense: 66 } },
  { name: "Carbon Wall", rating: 79, rarity: "common", nation: "Italy", clubName: "Night Bowl FC", stats: { pace: 72, shooting: 50, passing: 66, defense: 86 } },
  { name: "Vector Keeper", rating: 78, rarity: "common", nation: "Portugal", clubName: "Stadium United", stats: { pace: 60, shooting: 40, passing: 62, defense: 88 } },
  { name: "Signal Sprinter", rating: 77, rarity: "common", nation: "Japan", clubName: "Neon City", stats: { pace: 90, shooting: 64, passing: 64, defense: 50 } },

  { name: "Pulse Engine", rating: 84, rarity: "rare", nation: "Netherlands", clubName: "Neon City", stats: { pace: 84, shooting: 74, passing: 82, defense: 78 } },
  { name: "Arc Fullback", rating: 83, rarity: "rare", nation: "Croatia", clubName: "Stadium United", stats: { pace: 86, shooting: 58, passing: 76, defense: 80 } },
  { name: "Quantum Poacher", rating: 85, rarity: "rare", nation: "Nigeria", clubName: "Neon City", stats: { pace: 86, shooting: 86, passing: 70, defense: 52 } },
  { name: "Lime Destroyer", rating: 86, rarity: "rare", nation: "Uruguay", clubName: "Night Bowl FC", stats: { pace: 82, shooting: 72, passing: 78, defense: 88 } },
  { name: "Orbit Playmaker", rating: 85, rarity: "rare", nation: "Belgium", clubName: "Classic Park Rangers", stats: { pace: 78, shooting: 74, passing: 88, defense: 74 } },
  { name: "Apex Winger", rating: 86, rarity: "rare", nation: "Senegal", clubName: "Classic Park Rangers", stats: { pace: 92, shooting: 82, passing: 80, defense: 60 } },

  { name: "Edge Controller", rating: 89, rarity: "epic", nation: "Korea", clubName: "Neon City", stats: { pace: 82, shooting: 84, passing: 92, defense: 78 } },
  { name: "Grid Sentinel", rating: 90, rarity: "epic", nation: "Serbia", clubName: "Night Bowl FC", stats: { pace: 78, shooting: 66, passing: 80, defense: 94 } },
  { name: "Drift Winger", rating: 88, rarity: "epic", nation: "Brazil", clubName: "Classic Park Rangers", stats: { pace: 94, shooting: 82, passing: 80, defense: 62 } },
  { name: "Ion Finisher", rating: 87, rarity: "epic", nation: "Argentina", clubName: "Neon City", stats: { pace: 90, shooting: 90, passing: 78, defense: 54 } },

  { name: "Nova Striker", rating: 93, rarity: "legendary", nation: "Brazil", clubName: "Neon City", stats: { pace: 94, shooting: 95, passing: 88, defense: 56 } },
  { name: "Galactic Maestro", rating: 94, rarity: "legendary", nation: "Spain", clubName: "Classic Park Rangers", stats: { pace: 86, shooting: 90, passing: 96, defense: 80 } },
];

function getPoolForRarity(rarity) {
  return PLAYER_POOL.filter((p) => p.rarity === rarity);
}

function templateKeyFor(template) {
  if (template && template.templateKey) return String(template.templateKey);
  return `${template.rarity}:${slugify(template.name)}`;
}

const TEMPLATE_BY_KEY = Object.fromEntries(PLAYER_POOL.map((p) => [templateKeyFor(p), p]));

function findTemplateByKey(templateKey) {
  return TEMPLATE_BY_KEY[String(templateKey || "")] || null;
}

module.exports = { getPoolForRarity, templateKeyFor, slugify, findTemplateByKey };
