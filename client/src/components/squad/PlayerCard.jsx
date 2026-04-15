import { Icon } from "../Icon";
import { resolveCardFrame, resolvePlayerPortrait } from "../../game/assets";

const RARITY_BADGE = {
  common: "text-on-surface-variant",
  rare: "text-primary",
  epic: "text-tertiary",
  legendary: "text-secondary",
};

const SHIELD_CLIP = "polygon(50% 0%, 86% 16%, 86% 74%, 50% 100%, 14% 74%, 14% 16%)";

function safeRarity(r) {
  const k = String(r || "").toLowerCase();
  return k === "rare" || k === "epic" || k === "legendary" ? k : "common";
}

export function PlayerCard({ player, draggable = false, onDragStart, compact = false }) {
  const rarity = safeRarity(player?.rarity);
  const frameSrc = resolveCardFrame(rarity);
  const portraitSrc = resolvePlayerPortrait(player);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`select-none border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-highest/60 backdrop-blur-md transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing hover:border-primary/40" : ""
      }`}
    >
      <div className={`relative ${compact ? "h-[160px]" : "h-[220px]"}`}>
        {frameSrc ? <img src={frameSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95" /> : null}

        {portraitSrc ? (
          <div
            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[46%] h-[38%] overflow-hidden"
            style={{ clipPath: SHIELD_CLIP }}
          >
            <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface/35" />
          </div>
        ) : null}

        <div className="absolute top-3 left-3">
          <div className="bg-surface/55 border border-outline-variant/20 rounded-lg px-2 py-1">
            <div className="font-headline font-black text-lg leading-none text-on-surface">{player.rating}</div>
          </div>
        </div>

        <div className="absolute inset-x-[10%] top-[69%]">
          <div className="bg-surface/70 border border-outline-variant/15 rounded-xl px-3 py-2 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-headline font-black text-[11px] tracking-tight truncate">{player.name}</div>
                <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest truncate">{player.clubName || "—"}</div>
              </div>
              <div className="text-right">
                <div className="font-headline font-black text-[11px] text-on-surface">{player.position || "—"}</div>
                <div className={`mt-1 text-[10px] font-headline font-bold uppercase tracking-widest ${RARITY_BADGE[rarity]}`}>{rarity}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none hud-scanline opacity-10" />
      </div>

      {draggable ? (
        <div className="px-3 py-3 flex items-center gap-2 text-[10px] text-on-surface-variant">
          <Icon name="drag_indicator" className="text-sm" />
          Drag to a position
        </div>
      ) : null}
    </div>
  );
}
