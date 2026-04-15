import { resolveCardFrame, resolvePlayerPortrait } from "../assets";

function safeRarity(r) {
  const k = String(r || "").toLowerCase();
  return k === "rare" || k === "epic" || k === "legendary" ? k : "common";
}

const SHIELD_CLIP = "polygon(50% 0%, 86% 16%, 86% 74%, 50% 100%, 14% 74%, 14% 16%)";

export function PlayerCard({ player, onClick, selected = false, variant = "default" }) {
  const rarity = safeRarity(player?.rarity);
  const frameSrc = resolveCardFrame(rarity);
  const portraitSrc = resolvePlayerPortrait(player);

  const sizeClass = variant === "compact" ? "w-[210px]" : "w-[320px]";
  const rarityFx =
    rarity === "legendary"
      ? "card-fx-legendary"
      : rarity === "epic"
        ? "card-fx-epic"
        : rarity === "rare"
          ? "card-fx-rare"
          : "card-fx-common";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative ${sizeClass} aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-outline-variant/20 bg-surface-container-highest/40 backdrop-blur-md transition-transform duration-200 ${
        selected ? "scale-[1.02]" : "hover:scale-[1.02]"
      } ${rarityFx}`}
    >
      {frameSrc ? (
        <img src={frameSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95 pointer-events-none" />
      ) : null}

      {portraitSrc ? (
        <div
          className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[46%] h-[36%] overflow-hidden"
          style={{ clipPath: SHIELD_CLIP }}
        >
          <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface/35" />
        </div>
      ) : null}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 hud-scanline opacity-10" />
      </div>

      <div className="absolute top-[6%] left-[7%]">
        <div className="bg-surface/55 border border-outline-variant/20 rounded-lg px-2 py-1">
          <div className="font-headline font-black text-lg leading-none text-on-surface">{player?.rating ?? "—"}</div>
        </div>
      </div>

      <div className="absolute inset-x-[10%] top-[69%]">
        <div className="bg-surface/70 border border-outline-variant/15 rounded-xl px-3 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-headline font-black text-[11px] tracking-tight truncate">{player?.name || "—"}</div>
              <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest truncate">
                {(player?.clubName || "—").toString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-headline font-black text-[11px] text-on-surface">{(player?.position || "—").toString()}</div>
              <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">{rarity}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10" />
      </div>
    </button>
  );
}
