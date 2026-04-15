import { Icon } from "../Icon";
import { resolveCardFrame, resolvePlayerPortrait } from "../../game/assets";

const RARITY_BADGE = {
  common: "text-on-surface-variant",
  rare: "text-primary",
  epic: "text-tertiary",
  legendary: "text-secondary",
};

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
      <div className="relative">
        {frameSrc ? <img src={frameSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
        <div className="relative p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-headline font-black tracking-tight truncate">{player.name}</div>
              <div className={`mt-1 text-[10px] font-headline font-bold uppercase tracking-widest ${RARITY_BADGE[rarity]}`}>{rarity}</div>
              {player.position || player.clubName ? (
                <div className="mt-1 text-[10px] text-on-surface-variant truncate">
                  {[player.position, player.clubName].filter(Boolean).join(" • ")}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="font-headline font-black text-2xl leading-none text-primary">{player.rating}</div>
              {compact ? null : <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">OVR</div>}
            </div>
          </div>

          <div className="mt-3 h-24 rounded-lg overflow-hidden border border-outline-variant/10 bg-surface/10 relative">
            {portraitSrc ? <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /> : null}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface/70" />
          </div>

          {compact ? null : (
            <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              <div className="bg-surface-container-highest/50 border border-outline-variant/10 rounded-lg px-2 py-1 flex items-center justify-between">
                <span>Pac</span>
                <span className="text-on-surface">{player.stats.pace}</span>
              </div>
              <div className="bg-surface-container-highest/50 border border-outline-variant/10 rounded-lg px-2 py-1 flex items-center justify-between">
                <span>Sho</span>
                <span className="text-on-surface">{player.stats.shooting}</span>
              </div>
              <div className="bg-surface-container-highest/50 border border-outline-variant/10 rounded-lg px-2 py-1 flex items-center justify-between">
                <span>Pas</span>
                <span className="text-on-surface">{player.stats.passing}</span>
              </div>
              <div className="bg-surface-container-highest/50 border border-outline-variant/10 rounded-lg px-2 py-1 flex items-center justify-between">
                <span>Def</span>
                <span className="text-on-surface">{player.stats.defense}</span>
              </div>
            </div>
          )}

          {draggable ? (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-on-surface-variant">
              <Icon name="drag_indicator" className="text-sm" />
              Drag to a position
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
