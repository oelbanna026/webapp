import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useClub } from "../club/useClub";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { apiRequest, authHeaders } from "../lib/api";

const PRESET_LOGOS = [
  { id: "neon-wolf", label: "Alpha" },
  { id: "stadium-shield", label: "Beta" },
  { id: "cyber-eagle", label: "Gamma" },
  { id: "kinetic-bolt", label: "Delta" },
  { id: "classic-crown", label: "Epsilon" },
];

const EGYPT_TEAMS = [
  "الأسطورة",
  "الأهرام الرياضي",
  "الأمواج الزرقاء",
  "الصقور الملكية",
  "الفراعنة الجدد",
  "الأسود السود",
  "الحصن",
  "الحراس",
  "النسور الحمراء",
  "النيل الأزرق",
  "الوادي الأخضر",
  "الشمس المشرقة",
  "الصاعقة",
  "الجبل الأحمر",
  "الصحراء الذهبية",
  "البحر الأبيض",
  "الصحوة",
  "الفجر الرياضي",
  "النجوم الصاعدة",
  "الوحدة الرياضي",
];

const PRIMARY_SWATCHES = ["#81ecff", "#c3f400", "#a2aaff", "#ff716c"];
const SECONDARY_SWATCHES = ["#c3f400", "#20262f", "#ffffff", "#8d96f4"];

const COACHES = [
  { type: "attacking", name: "MARCUS VANGUARD", specialization: "Heavy Pressing", chips: ["+10 Attack", "+8% xG"] },
  { type: "balanced", name: "ELENA FLUX", specialization: "Positional Play", chips: ["+5 All", "+4% Possession"] },
  { type: "defensive", name: "ORION BASTION", specialization: "Low Block", chips: ["+10 Defense", "+8% Clean Sheets"] },
];

const THEMES = [
  { id: "night", label: "Vanguard Dark", focus: "Hyper‑Motion" },
  { id: "neon", label: "Neon Arena", focus: "Night Neon Mode" },
  { id: "classic", label: "Classic Park", focus: "Heritage Tempo" },
];

const STADIUMS = [
  { id: "night-bowl", name: "Night Bowl (L1)" },
  { id: "neon-dome", name: "Neon Arena (L1)" },
  { id: "classic-park", name: "Classic Park (L1)" },
];

function suggestMonogram(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = words
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!letters) return "";
  return letters.slice(0, 3);
}

export function ClubWizardKinetic() {
  const { token, refreshMe } = useAuth();
  const { refreshClub } = useClub();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState({ checking: false, available: null });
  const [teamName, setTeamName] = useState(EGYPT_TEAMS[0]);
  const [presetLogoId, setPresetLogoId] = useState(PRESET_LOGOS[0].id);
  const [logoMode, setLogoMode] = useState("preset");
  const [aiLogoUrl, setAiLogoUrl] = useState("");
  const [aiStyle, setAiStyle] = useState("minimal");
  const [aiMonogram, setAiMonogram] = useState("");
  const [primary, setPrimary] = useState("#81ecff");
  const [secondary, setSecondary] = useState("#c3f400");
  const [coachType, setCoachType] = useState("attacking");
  const [theme, setTheme] = useState("night");
  const [stadiumId, setStadiumId] = useState("neon-dome");
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNameStatus((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      try {
        const cleaned = name.trim();
        if (cleaned.length < 3) {
          if (!cancelled) setNameStatus({ checking: false, available: false });
          return;
        }
        const data = await apiRequest(`/api/clubs/check-name?name=${encodeURIComponent(cleaned)}`, {
          headers: authHeaders(token),
        });
        if (!cancelled) setNameStatus({ checking: false, available: !!data.available });
      } catch {
        if (!cancelled) setNameStatus({ checking: false, available: null });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, token]);

  useEffect(() => {
    if (!aiMonogram) {
      const suggested = suggestMonogram(name);
      if (suggested) setAiMonogram(suggested);
    }
  }, [aiMonogram, name]);

  const themeMeta = useMemo(() => THEMES.find((t) => t.id === theme) || THEMES[0], [theme]);
  const coachMeta = useMemo(() => COACHES.find((c) => c.type === coachType) || COACHES[0], [coachType]);

  const step1Ok = name.trim().length >= 3 && nameStatus.available === true;
  const step2Ok = logoMode === "preset" ? !!presetLogoId : aiLogoUrl.trim().length > 10;
  const step3Ok = /^#[0-9a-fA-F]{6}$/.test(primary) && /^#[0-9a-fA-F]{6}$/.test(secondary);
  const step4Ok = ["attacking", "balanced", "defensive"].includes(coachType);
  const canFinish = step1Ok && step2Ok && step3Ok && step4Ok && ["night", "neon", "classic"].includes(theme) && !!stadiumId;

  async function generateAiLogo() {
    setError(null);
    setIsGeneratingLogo(true);
    try {
      const data = await apiRequest("/api/ai/logo", {
        method: "POST",
        headers: authHeaders(token),
        json: { clubName: name.trim(), primary, secondary, theme, style: aiStyle, monogram: aiMonogram },
      });
      setAiLogoUrl(data.logo.url);
    } catch (err) {
      setError(err.message || "فشل توليد الشعار");
    } finally {
      setIsGeneratingLogo(false);
    }
  }

  async function finish() {
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        affiliation: { leagueKey: "egypt", teamName },
        logo:
          logoMode === "preset"
            ? { type: "preset", presetId: presetLogoId }
            : { type: "ai", url: aiLogoUrl.trim(), meta: { style: aiStyle, monogram: aiMonogram } },
        kit: { primary, secondary },
        coach: { type: coachType },
        theme,
        stadium: { id: stadiumId },
      };
      await apiRequest("/api/clubs", { method: "POST", headers: authHeaders(token), json: payload });
      await refreshClub();
      await refreshMe();
      navigate("/hook/packs", { replace: true });
    } catch (err) {
      setError(err.message || "فشل إنشاء النادي");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background text-on-surface font-body">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tertiary rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <main className="flex min-h-screen w-full relative">
        <section className="w-full lg:w-[65%] p-8 lg:p-16 z-10 flex flex-col justify-between">
          <div>
            <header className="mb-12">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-primary font-headline font-bold tracking-[0.2em] text-xs uppercase">Initial Protocol</span>
                <div className="h-[1px] flex-grow bg-outline-variant opacity-20" />
              </div>
              <h1 className="font-headline text-4xl lg:text-6xl font-bold tracking-tight text-on-surface">
                ESTABLISH YOUR <span className="text-primary italic">LEGACY</span>
              </h1>
            </header>

            <nav className="flex gap-4 mb-16">
              <div className={`flex-1 h-1 rounded-full ${step1Ok ? "bg-primary neon-glow-primary" : "bg-surface-container-highest"}`} />
              <div className={`flex-1 h-1 rounded-full ${step2Ok ? "bg-primary neon-glow-primary" : "bg-surface-container-highest"}`} />
              <div className={`flex-1 h-1 rounded-full ${step3Ok ? "bg-primary neon-glow-primary" : "bg-surface-container-highest"}`} />
              <div className={`flex-1 h-1 rounded-full ${step4Ok ? "bg-primary neon-glow-primary" : "bg-surface-container-highest"}`} />
            </nav>

            {error ? (
              <div className="mb-10 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
                <Icon name="error" className="text-sm" />
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div>
                  <label className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-4 block">
                    01 // CLUB NOMENCLATURE
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 px-6 py-5 font-headline text-2xl tracking-tighter focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all placeholder:text-on-surface-variant/30 uppercase"
                      placeholder="ENTER CLUB NAME..."
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {nameStatus.checking ? <span className="text-on-surface-variant text-xs">…</span> : null}
                      {name.trim().length >= 3 && nameStatus.available === true ? (
                        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      ) : null}
                      {name.trim().length >= 3 && nameStatus.available === false ? (
                        <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                          cancel
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      League Team (Egypt)
                    </div>
                    <select
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                    >
                      {EGYPT_TEAMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-[10px] text-on-surface-variant">
                      سيتم إنشاء تشكيلة بداية (4‑3‑3) من هذا الفريق تلقائيًا + باكات بداية.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-6 block">
                    02 // SELECT CREST ARCHETYPE
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {PRESET_LOGOS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setLogoMode("preset");
                          setPresetLogoId(l.id);
                        }}
                        className={`aspect-square glass-card p-4 flex items-center justify-center transition-all border ${
                          logoMode === "preset" && presetLogoId === l.id
                            ? "border-primary/60 ring-1 ring-primary/50"
                            : "border-outline-variant/20 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-xl border border-outline-variant/15 bg-surface-container-highest/40 grid place-items-center">
                            <Icon name="shield" className="text-primary text-xl" />
                          </div>
                          <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            {l.label}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLogoMode((m) => (m === "ai" ? "preset" : "ai"))}
                      className={`aspect-square glass-card p-4 flex items-center justify-center transition-all border ${
                        logoMode === "ai" ? "border-secondary/60 ring-1 ring-secondary/40" : "border-outline-variant/20 hover:border-secondary/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-outline-variant text-4xl">add_circle</span>
                    </button>
                  </div>

                  {logoMode === "ai" ? (
                    <div className="mt-6 glass-card border border-outline-variant/20 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">AI Crest</div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-on-surface-variant">
                            <span className="text-on-surface">Style</span>
                            <select
                              value={aiStyle}
                              onChange={(e) => setAiStyle(e.target.value)}
                              className="bg-surface-container-lowest border border-outline-variant/20 px-2 py-1 text-[10px] uppercase tracking-widest"
                            >
                              <option value="minimal">Minimal</option>
                              <option value="aggressive">Aggressive</option>
                              <option value="classic">Classic</option>
                            </select>
                            <span className="text-on-surface">Mono</span>
                            <input
                              value={aiMonogram}
                              onChange={(e) => setAiMonogram(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
                              className="w-16 bg-surface-container-lowest border border-outline-variant/20 px-2 py-1 text-[10px] uppercase tracking-widest"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={generateAiLogo}
                          disabled={isGeneratingLogo || !step1Ok || !step3Ok}
                          className="px-5 py-3 text-xs neon-glow-primary"
                        >
                          <Icon name="auto_awesome" className="text-sm" />
                          {isGeneratingLogo ? "Generating…" : "Generate"}
                        </Button>
                      </div>
                      {aiLogoUrl ? (
                        <div className="mt-5 flex items-center gap-4">
                          <div className="w-20 h-20 border border-outline-variant/20 bg-surface-container-lowest grid place-items-center overflow-hidden">
                            <img alt="AI crest" src={aiLogoUrl} className="w-full h-full object-contain" />
                          </div>
                          <div className="text-[10px] text-on-surface-variant">
                            تم توليد الشعار من السيرفر. عند الحفظ سيتم ربطه بالنادي.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-6 block">
                    03 // CHROMATIC SIGNATURE
                  </label>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Primary</span>
                      <div className="flex gap-2">
                        {PRIMARY_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPrimary(c)}
                            className="w-8 h-8 rounded-none hover:scale-110 transition-transform"
                            style={{
                              background: c,
                              outline: c.toLowerCase() === primary.toLowerCase() ? `2px solid ${c}` : "none",
                              outlineOffset: 4,
                            }}
                            aria-label={`Primary ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] uppercase font-bold text-on-surface-variant">Secondary</span>
                      <div className="flex gap-2">
                        {SECONDARY_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSecondary(c)}
                            className="w-8 h-8 rounded-none hover:scale-110 transition-transform"
                            style={{
                              background: c,
                              outline: c.toLowerCase() === secondary.toLowerCase() ? `2px solid ${c}` : "none",
                              outlineOffset: 4,
                            }}
                            aria-label={`Secondary ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-6 block">
                    04 // COMMANDER SELECTION
                  </label>
                  <div className="space-y-4">
                    {COACHES.map((c) => {
                      const active = c.type === coachType;
                      return (
                        <button
                          key={c.type}
                          type="button"
                          onClick={() => setCoachType(c.type)}
                          className={`w-full glass-card p-4 flex items-center gap-4 transition-all border ${
                            active ? "border-secondary/40 ring-1 ring-secondary/20" : "border-outline-variant/10 hover:border-primary/30"
                          } ${active ? "" : "opacity-70 hover:opacity-100"}`}
                        >
                          <div className="w-16 h-16 bg-surface-container-high overflow-hidden grid place-items-center border border-outline-variant/15">
                            <Icon name="person" className="text-on-surface-variant" />
                          </div>
                          <div className="flex-grow text-left">
                            <div className="font-headline font-bold text-sm tracking-tight">{c.name}</div>
                            <div className="text-[10px] text-on-surface-variant">Tactical Specialization: {c.specialization}</div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {c.chips.map((chip) => (
                                <span key={chip} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 font-bold">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>
                          {active ? (
                            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant">radio_button_unchecked</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-12">
            <button type="button" onClick={() => navigate("/")} className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined align-middle mr-2 text-sm">arrow_back</span>
              Abort Process
            </button>
            <div className="flex items-center gap-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Current Sequence
                <span className="text-on-surface ml-2">{canFinish ? "DNA Encoding: Ready" : "DNA Encoding: Pending"}</span>
              </div>
              <Button onClick={finish} disabled={isSaving || !canFinish} className="px-8 py-5 text-xs neon-glow-primary">
                {isSaving ? "Initializing…" : "Initialize Identity"}
                <span className="material-symbols-outlined ml-2 text-sm">double_arrow</span>
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden lg:flex w-[35%] p-10 z-10 border-l border-outline-variant/15">
          <div className="w-full flex flex-col">
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant uppercase tracking-widest font-headline">
              <span>SYS_AUTH_READY</span>
              <span>GRID_POS: 42.12 / 88.01</span>
            </div>

            <div className="mt-8 glass-card p-8 border border-outline-variant/20">
              <div className="w-full aspect-square bg-surface-container-lowest border border-outline-variant/20 grid place-items-center relative overflow-hidden">
                <div className="absolute inset-10 border border-outline-variant/20" />
                <div className="absolute inset-14 border border-primary/20" />
                {logoMode === "ai" && aiLogoUrl ? (
                  <img alt="crest" src={aiLogoUrl} className="w-40 h-40 object-contain opacity-90" />
                ) : (
                  <div className="w-40 h-40 grid place-items-center bg-surface-container-highest/30 border border-outline-variant/15">
                    <Icon name="shield" className="text-primary text-5xl" />
                  </div>
                )}
              </div>

              <div className="mt-8">
                <div className="font-headline font-black text-3xl tracking-tight text-primary">
                  {name.trim() ? name.trim().toUpperCase() : "KINETIC PULSE FC"}
                </div>
                <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">ELITE DIVISION STATUS</div>
              </div>

              <div className="mt-8 space-y-4 text-[10px] font-headline font-bold uppercase tracking-widest">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                  <span className="text-on-surface-variant">Home Stadium</span>
                  <select
                    value={stadiumId}
                    onChange={(e) => setStadiumId(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant/20 px-3 py-2 text-[10px] uppercase tracking-widest"
                  >
                    {STADIUMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
                  <span className="text-on-surface-variant">Core Aesthetics</span>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant/20 px-3 py-2 text-[10px] uppercase tracking-widest"
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Tactical Focus</span>
                  <span className="text-on-surface">{themeMeta.focus}</span>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Primary Colors</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-10 h-10 border border-outline-variant/20" style={{ background: primary }} />
                  <div className="w-10 h-10 border border-outline-variant/20" style={{ background: secondary }} />
                  <div className="w-10 h-10 border border-outline-variant/20 bg-surface-container-lowest" />
                </div>
              </div>

              <div className="mt-8">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Commander</div>
                <div className="mt-2 font-headline font-black">{coachMeta.name}</div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between text-[10px] text-on-surface-variant uppercase tracking-widest font-headline">
              <span>SYNC_ACTIVE</span>
              <span>VER: 1.0.0</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
