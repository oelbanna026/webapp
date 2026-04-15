import { Icon } from "../Icon";
import { resolveCardFrame, resolvePlayerPortrait } from "../../game/assets";

const FORMATIONS = {
  "4-3-3": [
    { key: "LW", label: "LW", x: 25, y: 22 },
    { key: "ST", label: "ST", x: 50, y: 18 },
    { key: "RW", label: "RW", x: 75, y: 22 },
    { key: "LCM", label: "LCM", x: 30, y: 45 },
    { key: "CM", label: "CM", x: 50, y: 48 },
    { key: "RCM", label: "RCM", x: 70, y: 45 },
    { key: "LB", label: "LB", x: 20, y: 68 },
    { key: "LCB", label: "LCB", x: 40, y: 74 },
    { key: "RCB", label: "RCB", x: 60, y: 74 },
    { key: "RB", label: "RB", x: 80, y: 68 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "4-4-2": [
    { key: "ST", label: "ST1", x: 43, y: 18 },
    { key: "ST2", label: "ST2", x: 57, y: 18 },
    { key: "LM", label: "LM", x: 20, y: 40 },
    { key: "LCM", label: "LCM", x: 42, y: 48 },
    { key: "RCM", label: "RCM", x: 58, y: 48 },
    { key: "RM", label: "RM", x: 80, y: 40 },
    { key: "LB", label: "LB", x: 20, y: 68 },
    { key: "LCB", label: "LCB", x: 40, y: 74 },
    { key: "RCB", label: "RCB", x: 60, y: 74 },
    { key: "RB", label: "RB", x: 80, y: 68 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "4-2-3-1": [
    { key: "ST", label: "ST", x: 50, y: 18 },
    { key: "LAM", label: "LAM", x: 24, y: 30 },
    { key: "CAM", label: "CAM", x: 50, y: 34 },
    { key: "RAM", label: "RAM", x: 76, y: 30 },
    { key: "LDM", label: "LDM", x: 40, y: 56 },
    { key: "RDM", label: "RDM", x: 60, y: 56 },
    { key: "LB", label: "LB", x: 20, y: 68 },
    { key: "LCB", label: "LCB", x: 40, y: 74 },
    { key: "RCB", label: "RCB", x: 60, y: 74 },
    { key: "RB", label: "RB", x: 80, y: 68 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "4-1-2-1-2": [
    { key: "ST", label: "ST1", x: 43, y: 18 },
    { key: "ST2", label: "ST2", x: 57, y: 18 },
    { key: "CAM", label: "CAM", x: 50, y: 34 },
    { key: "LCM", label: "LCM", x: 38, y: 52 },
    { key: "RCM", label: "RCM", x: 62, y: 52 },
    { key: "CDM", label: "CDM", x: 50, y: 62 },
    { key: "LB", label: "LB", x: 20, y: 68 },
    { key: "LCB", label: "LCB", x: 40, y: 74 },
    { key: "RCB", label: "RCB", x: 60, y: 74 },
    { key: "RB", label: "RB", x: 80, y: 68 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "4-5-1": [
    { key: "ST", label: "ST", x: 50, y: 18 },
    { key: "LM", label: "LM", x: 20, y: 40 },
    { key: "LCM", label: "LCM", x: 38, y: 50 },
    { key: "CM", label: "CM", x: 50, y: 54 },
    { key: "RCM", label: "RCM", x: 62, y: 50 },
    { key: "RM", label: "RM", x: 80, y: 40 },
    { key: "LB", label: "LB", x: 20, y: 68 },
    { key: "LCB", label: "LCB", x: 40, y: 74 },
    { key: "RCB", label: "RCB", x: 60, y: 74 },
    { key: "RB", label: "RB", x: 80, y: 68 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "3-4-3": [
    { key: "LW", label: "LW", x: 25, y: 22 },
    { key: "ST", label: "ST", x: 50, y: 18 },
    { key: "RW", label: "RW", x: 75, y: 22 },
    { key: "LM", label: "LM", x: 20, y: 44 },
    { key: "LCM", label: "LCM", x: 40, y: 52 },
    { key: "RCM", label: "RCM", x: 60, y: 52 },
    { key: "RM", label: "RM", x: 80, y: 44 },
    { key: "LCB", label: "LCB", x: 36, y: 74 },
    { key: "CB", label: "CB", x: 50, y: 78 },
    { key: "RCB", label: "RCB", x: 64, y: 74 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "3-5-2": [
    { key: "ST", label: "ST1", x: 43, y: 18 },
    { key: "ST2", label: "ST2", x: 57, y: 18 },
    { key: "LM", label: "LM", x: 18, y: 40 },
    { key: "LCM", label: "LCM", x: 35, y: 52 },
    { key: "CM", label: "CM", x: 50, y: 56 },
    { key: "RCM", label: "RCM", x: 65, y: 52 },
    { key: "RM", label: "RM", x: 82, y: 40 },
    { key: "LCB", label: "LCB", x: 36, y: 74 },
    { key: "CB", label: "CB", x: 50, y: 78 },
    { key: "RCB", label: "RCB", x: 64, y: 74 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
  "5-3-2": [
    { key: "ST", label: "ST1", x: 43, y: 18 },
    { key: "ST2", label: "ST2", x: 57, y: 18 },
    { key: "LCM", label: "LCM", x: 38, y: 52 },
    { key: "CM", label: "CM", x: 50, y: 56 },
    { key: "RCM", label: "RCM", x: 62, y: 52 },
    { key: "LWB", label: "LWB", x: 14, y: 60 },
    { key: "RWB", label: "RWB", x: 86, y: 60 },
    { key: "LCB", label: "LCB", x: 36, y: 74 },
    { key: "CB", label: "CB", x: 50, y: 78 },
    { key: "RCB", label: "RCB", x: 64, y: 74 },
    { key: "GK", label: "GK", x: 50, y: 90 },
  ],
};

function Slot({ position, player, onDropPlayer, onClear, onDragStartPlayer, isOver, setOverKey }) {
  const rarity = player?.rarity || "common";
  const frameSrc = player ? resolveCardFrame(rarity) : null;
  const portraitSrc = player ? resolvePlayerPortrait(player) : null;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOverKey(position.key);
      }}
      onDragLeave={() => setOverKey(null)}
      onDrop={(e) => {
        e.preventDefault();
        setOverKey(null);
        onDropPlayer(position.key, e);
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div
        className={`w-[88px] sm:w-[96px] rounded-xl border backdrop-blur-md transition-all ${
          isOver ? "border-primary/60 bg-surface-container-highest/80" : "border-outline-variant/20 bg-surface-container-highest/60"
        }`}
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="text-[10px] font-headline font-black uppercase tracking-widest text-on-surface-variant">
            {position.label}
          </div>
          {player ? (
            <button
              type="button"
              onClick={() => onClear(position.key)}
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              <Icon name="close" className="text-sm" />
            </button>
          ) : null}
        </div>
        {player ? (
          <div
            draggable
            onDragStart={(e) => onDragStartPlayer(position.key, e)}
            className="px-2 pb-2 cursor-grab active:cursor-grabbing"
          >
            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/10 bg-surface/10">
              {frameSrc ? <img src={frameSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-95" /> : null}
              {portraitSrc ? <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" /> : null}
              <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 text-[10px] font-headline font-black text-primary">{player.rating}</div>
              <div className="absolute top-2 right-2 text-[10px] font-headline font-black text-on-surface-variant">
                {String(player.position || position.key)}
              </div>
              <div className="absolute inset-x-2 bottom-2">
                <div className="text-[10px] font-headline font-black text-on-surface truncate">{player.name}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3 text-[10px] text-on-surface-variant">Drop player</div>
        )}
      </div>
    </div>
  );
}

export function Pitch({ formation, slots, playersById, onDropPlayer, onClearSlot, onDragStartFromSlot, overKey, setOverKey }) {
  const positions = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  return (
    <section className="glass-card rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline font-black text-lg tracking-tight uppercase">Squad Formation</h2>
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">{formation}</p>
        </div>
        <div className="bg-surface-bright text-on-surface px-3 py-1 rounded font-headline font-black text-sm">{formation}</div>
      </div>

      <div className="mt-6 relative w-full h-[520px] rounded-xl border border-outline-variant/15 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-container-highest/50 to-transparent" />
        <div className="absolute inset-6 border border-outline-variant/10 rounded-xl" />
        <div className="absolute top-1/2 left-6 right-6 h-[1px] bg-outline-variant/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-outline-variant/10 rounded-full" />
        <div className="absolute top-6 bottom-6 left-1/2 w-[1px] bg-outline-variant/10" />
        <div className="absolute inset-0 hud-scanline opacity-15" />

        {positions.map((position) => (
          <Slot
            key={position.key}
            position={position}
            player={slots[position.key] ? playersById[slots[position.key]] : null}
            onDropPlayer={onDropPlayer}
            onClear={onClearSlot}
            onDragStartPlayer={onDragStartFromSlot}
            isOver={overKey === position.key}
            setOverKey={setOverKey}
          />
        ))}
      </div>
    </section>
  );
}
