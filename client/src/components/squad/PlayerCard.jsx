import { Icon } from "../Icon";

const RARITY_STYLES = {
  common: "bg-surface-container-highest/60 border-outline-variant/30",
  rare: "bg-surface-container-highest/60 border-primary/30",
  epic: "bg-surface-container-highest/60 border-tertiary/40",
  legendary: "bg-surface-container-highest/60 border-secondary/40",
};

const RARITY_BADGE = {
  common: "text-on-surface-variant",
  rare: "text-primary",
  epic: "text-tertiary",
  legendary: "text-secondary",
};

export function PlayerCard({ player, draggable = false, onDragStart, compact = false }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`select-none border rounded-xl p-3 backdrop-blur-md transition-all ${
        RARITY_STYLES[player.rarity] || RARITY_STYLES.common
      } ${draggable ? "cursor-grab active:cursor-grabbing hover:border-primary/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-headline font-black tracking-tight truncate">{player.name}</div>
          <div className={`mt-1 text-[10px] font-headline font-bold uppercase tracking-widest ${RARITY_BADGE[player.rarity]}`}>
            {player.rarity}
          </div>
          {player.nation || player.clubName ? (
            <div className="mt-1 text-[10px] text-on-surface-variant truncate">
              {[player.nation, player.clubName].filter(Boolean).join(" • ")}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="font-headline font-black text-2xl leading-none text-primary">{player.rating}</div>
          {compact ? null : (
            <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              OVR
            </div>
          )}
        </div>
      </div>

      {compact ? null : (
        <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
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
  );
}
