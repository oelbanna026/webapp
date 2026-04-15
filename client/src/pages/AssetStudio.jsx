import { useMemo, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { assetManifest, clearAssetOverrides, loadAssetOverrides, saveAssetOverrides } from "../game/assets";

export function AssetStudio() {
  const initial = useMemo(() => loadAssetOverrides(), []);
  const [raw, setRaw] = useState(JSON.stringify(initial, null, 2));
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  function onSave() {
    setError(null);
    try {
      const parsed = JSON.parse(raw || "{}");
      saveAssetOverrides(parsed);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Invalid JSON");
    }
  }

  function onReset() {
    clearAssetOverrides();
    setRaw("{}");
    setSavedAt(new Date().toISOString());
    setError(null);
  }

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Asset Studio</h1>
            <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              Local overrides (no deploy) • base: {assetManifest.base}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onReset} variant="ghost" className="px-5 py-3 text-xs">
              <Icon name="delete" className="text-sm" />
              Reset
            </Button>
            <Button onClick={onSave} className="px-5 py-3 text-xs neon-glow-primary">
              <Icon name="save" className="text-sm" />
              Save
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
            <Icon name="error" className="text-sm" />
            {error}
          </div>
        ) : null}

        {savedAt ? <div className="mt-4 text-[10px] text-on-surface-variant">Saved: {savedAt}</div> : null}

        <div className="mt-8 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 glass-card rounded-xl p-6">
            <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Overrides JSON</div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="mt-3 w-full min-h-[520px] bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-xs text-on-surface font-mono focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass-card rounded-xl p-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Examples</div>
              <div className="mt-3 text-xs text-on-surface-variant whitespace-pre-wrap">{`{
  "players": {
    "portraits": {
      "p01": "/game-assets/players/custom_01.png"
    }
  },
  "cards": {
    "frames": {
      "legendary": "/game-assets/cards/legendary_alt.png"
    }
  }
}`}</div>
            </div>
            <div className="glass-card rounded-xl p-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Notes</div>
              <div className="mt-3 text-xs text-on-surface-variant whitespace-pre-wrap">
                Put real files under: client/public/game-assets/… then override paths here.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

