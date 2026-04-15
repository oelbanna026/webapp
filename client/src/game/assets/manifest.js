const BASE = "/game-assets";

export const assetManifest = {
  base: BASE,
  players: {
    portraits: {
      p01: `${BASE}/players/p01.png`,
      p02: `${BASE}/players/p02.png`,
      p03: `${BASE}/players/p03.png`,
      p04: `${BASE}/players/p04.png`,
      p05: `${BASE}/players/p05.png`,
      p06: `${BASE}/players/p06.png`,
      p07: `${BASE}/players/p07.png`,
      p08: `${BASE}/players/p08.png`,
      p09: `${BASE}/players/p09.png`,
      p10: `${BASE}/players/p10.png`,
    },
  },
  cards: {
    frames: {
      common: `${BASE}/cards/common.png`,
      rare: `${BASE}/cards/rare.png`,
      epic: `${BASE}/cards/epic.png`,
      legendary: `${BASE}/cards/legendary.png`,
    },
  },
  clubs: {
    logos: {
      egypt: `${BASE}/logos/egypt/`,
    },
    kits: {
      egypt: {
        home: `${BASE}/kits/egypt/home/`,
        away: `${BASE}/kits/egypt/away/`,
      },
    },
  },
  effects: {
    particles: `${BASE}/effects/particles/`,
    sfx: `${BASE}/effects/sfx/`,
  },
};

