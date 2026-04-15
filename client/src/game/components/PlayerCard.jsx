import { resolveCardFrame, resolvePlayerPortrait } from "../assets";

const RARITY_ACCENT = {
  common: { ring: "ring-outline-variant/20", text: "text-on-surface" },
  rare: { ring: "ring-primary/30", text: "text-primary" },
  epic: { ring: "ring-tertiary/30", text: "text-tertiary" },
  legendary: { ring: "ring-secondary/30", text: "text-secondary" },
};

function safeRarity(r) {
  const k = String(r || "").toLowerCase();
  return k === "rare" || k === "epic" || k === "legendary" ? k : "common";
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-headline font-black text-on-surface">{value}</span>
    </div>
  );
}

export function PlayerCard({ player, onClick, selected = false, variant = "default" }) {
  const rarity = safeRarity(player?.rarity);
  const accent = RARITY_ACCENT[rarity] || RARITY_ACCENT.common;
  const frameSrc = resolveCardFrame(rarity);
  const portraitSrc = resolvePlayerPortrait(player);

  const sizeClass = variant === "compact" ? "w-[200px]" : "w-[260px]";
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
      className={`group relative ${sizeClass} aspect-[2/3] rounded-2xl overflow-hidden ring-1 ${accent.ring} bg-surface-container-highest/40 backdrop-blur-md transition-transform duration-200 ${
        selected ? "scale-[1.02]" : "hover:scale-[1.02]"
      } ${rarityFx}`}
    >
      {frameSrc ? (
        <img src={frameSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95 pointer-events-none" />
      ) : null}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
        <div className="absolute inset-0 hud-scanline opacity-15" />
      </div>

      <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between gap-3">
        <div className="text-left min-w-0">
          <div className="font-headline font-black uppercase tracking-tight truncate">{player?.name || "Unknown"}</div>
          <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">
            {(player?.position || "—").toString()} • {(player?.clubName || "—").toString()}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-headline font-black text-xl leading-none ${accent.text}`}>{player?.rating ?? "—"}</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-widest">OVR</div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-[72px] bottom-[92px] px-4">
        <div className="relative w-full h-full rounded-xl overflow-hidden border border-outline-variant/10 bg-surface/10">
          {portraitSrc ? (
            <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[10px] text-on-surface-variant uppercase tracking-widest">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/70" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3 text-left">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <StatRow label="PAC" value={player?.stats?.pace ?? "—"} />
            <StatRow label="SHO" value={player?.stats?.shooting ?? "—"} />
            <StatRow label="PAS" value={player?.stats?.passing ?? "—"} />
            <StatRow label="DEF" value={player?.stats?.defense ?? "—"} />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary/10" />
      </div>
    </button>
  );
}

