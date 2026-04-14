import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useClub } from "../club/useClub";
import { apiRequest, authHeaders } from "../lib/api";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";

const PRESET_LOGOS = [
  { id: "neon-wolf", label: "Neon Wolf" },
  { id: "stadium-shield", label: "Stadium Shield" },
  { id: "cyber-eagle", label: "Cyber Eagle" },
  { id: "kinetic-bolt", label: "Kinetic Bolt" },
  { id: "classic-crown", label: "Classic Crown" },
  { id: "city-star", label: "City Star" },
];

const COACHES = [
  { type: "attacking", label: "هجومي", bonus: "+10 Attack" },
  { type: "defensive", label: "دفاعي", bonus: "+10 Defense" },
  { type: "balanced", label: "متوازن", bonus: "Boost عام" },
];

const THEMES = [
  { id: "night", label: "Night Stadium 🌙" },
  { id: "neon", label: "Neon Arena 🔥" },
  { id: "classic", label: "Classic Stadium 🏟️" },
];

const STADIUMS = [
  { id: "night-bowl", label: "Night Bowl", hint: "Moody lights, cinematic fog" },
  { id: "neon-dome", label: "Neon Dome", hint: "Cyber LED, high contrast" },
  { id: "classic-park", label: "Classic Park", hint: "Heritage vibe, clean grass" },
];

const AI_STYLES = [
  { id: "minimal", label: "Minimal" },
  { id: "aggressive", label: "Aggressive" },
  { id: "classic", label: "Classic" },
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

function StepPill({ active, done, children }) {
  return (
    <div
      className={`px-3 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-widest border ${
        active
          ? "border-primary/50 text-primary bg-surface-container-highest/60"
          : done
            ? "border-secondary/40 text-secondary bg-surface-container-highest/40"
            : "border-outline-variant/20 text-on-surface-variant bg-surface-container-highest/30"
      }`}
    >
      {children}
    </div>
  );
}

function ShirtPreview({ primary, secondary }) {
  return (
    <div className="w-full max-w-sm">
      <div className="glass-card rounded-2xl p-6">
        <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Kit Preview</div>
        <div className="mt-5 relative h-44 rounded-2xl border border-outline-variant/20 overflow-hidden">
          <div className="absolute inset-0" style={{ background: primary }} />
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.20),transparent_55%)]" />
          <div className="absolute inset-0 hud-scanline opacity-10" />
          <div className="absolute left-0 top-0 bottom-0 w-12" style={{ background: secondary }} />
          <div className="absolute right-0 top-0 bottom-0 w-12" style={{ background: secondary }} />
          <div className="absolute left-1/2 top-5 -translate-x-1/2 w-10 h-10 rounded-full border border-outline-variant/30 bg-surface/40 backdrop-blur-md grid place-items-center">
            <Icon name="sports_soccer" className="text-on-surface" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-[10px] font-headline font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="w-3 h-3 rounded border border-outline-variant/30" style={{ background: primary }} />
            Primary
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="w-3 h-3 rounded border border-outline-variant/30" style={{ background: secondary }} />
            Secondary
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClubWizard() {
  const { token, refreshMe } = useAuth();
  const { refreshClub } = useClub();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState({ checking: false, available: null });
  const [logoMode, setLogoMode] = useState("preset");
  const [presetLogoId, setPresetLogoId] = useState(PRESET_LOGOS[0].id);
  const [aiLogoUrl, setAiLogoUrl] = useState("");
  const [aiLogoStyle, setAiLogoStyle] = useState("minimal");
  const [aiMonogram, setAiMonogram] = useState("");
  const [primary, setPrimary] = useState("#81ecff");
  const [secondary, setSecondary] = useState("#c3f400");
  const [coachType, setCoachType] = useState("balanced");
  const [theme, setTheme] = useState("night");
  const [stadiumId, setStadiumId] = useState("night-bowl");
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
    }, 350);
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

  const canNext = useMemo(() => {
    if (step === 1) return name.trim().length >= 3 && nameStatus.available === true;
    if (step === 2) return logoMode === "preset" ? !!presetLogoId : aiLogoUrl.trim().length > 10;
    if (step === 3) return /^#[0-9a-fA-F]{6}$/.test(primary) && /^#[0-9a-fA-F]{6}$/.test(secondary);
    if (step === 4) return ["attacking", "defensive", "balanced"].includes(coachType);
    if (step === 5) return ["night", "neon", "classic"].includes(theme) && STADIUMS.some((s) => s.id === stadiumId);
    return false;
  }, [aiLogoUrl, coachType, logoMode, name, nameStatus.available, presetLogoId, primary, secondary, stadiumId, step, theme]);

  async function generateAiLogo() {
    setError(null);
    setIsGeneratingLogo(true);
    try {
      const data = await apiRequest("/api/ai/logo", {
        method: "POST",
        headers: authHeaders(token),
        json: { clubName: name.trim(), primary, secondary, theme, style: aiLogoStyle, monogram: aiMonogram },
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
        logo:
          logoMode === "preset"
            ? { type: "preset", presetId: presetLogoId }
            : { type: "ai", url: aiLogoUrl.trim(), meta: { style: aiLogoStyle, monogram: aiMonogram } },
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
    <div className="min-h-screen bg-background text-on-surface grid place-items-center p-6">
      <div className="glass-card rounded-2xl p-8 w-full max-w-4xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Club Creation</h1>
            <div className="mt-2 text-sm text-on-surface-variant">Wizard خطوة بخطوة: نادي • شعار • طقم • مدرب • ثيم</div>
          </div>
          <div className="flex items-center gap-2">
            <StepPill active={step === 1} done={step > 1}>
              1
            </StepPill>
            <StepPill active={step === 2} done={step > 2}>
              2
            </StepPill>
            <StepPill active={step === 3} done={step > 3}>
              3
            </StepPill>
            <StepPill active={step === 4} done={step > 4}>
              4
            </StepPill>
            <StepPill active={step === 5} done={false}>
              5
            </StepPill>
          </div>
        </div>

        {error ? (
          <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
            <Icon name="error" className="text-sm" />
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  1) اختيار اسم النادي
                </div>
                <Input label="اسم النادي" value={name} onChange={(e) => setName(e.target.value)} placeholder='مثال: "Al Madinah FC"' />
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest">
                  {nameStatus.checking ? (
                    <span className="text-on-surface-variant">Checking…</span>
                  ) : name.trim().length < 3 ? (
                    <span className="text-on-surface-variant">Minimum 3 characters</span>
                  ) : nameStatus.available === true ? (
                    <span className="text-secondary">Available</span>
                  ) : nameStatus.available === false ? (
                    <span className="text-error">Taken</span>
                  ) : (
                    <span className="text-on-surface-variant">—</span>
                  )}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">2) اختيار الشعار (Logo)</div>
                <div className="flex items-center gap-3">
                  <Button variant={logoMode === "preset" ? "primary" : "ghost"} onClick={() => setLogoMode("preset")}>
                    Presets
                  </Button>
                  <Button variant={logoMode === "ai" ? "primary" : "ghost"} onClick={() => setLogoMode("ai")}>
                    AI Generate
                  </Button>
                </div>

                {logoMode === "preset" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PRESET_LOGOS.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setPresetLogoId(l.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          presetLogoId === l.id ? "border-primary/60 bg-surface-container-highest/70" : "border-outline-variant/20 bg-surface-container-highest/40 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-headline font-black truncate">{l.label}</div>
                            <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">{l.id}</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl border border-outline-variant/20 bg-surface/30 grid place-items-center">
                            <Icon name="shield" className="text-primary" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={generateAiLogo}
                        disabled={
                          isGeneratingLogo ||
                          name.trim().length < 3 ||
                          !/^#[0-9a-fA-F]{6}$/.test(primary) ||
                          !/^#[0-9a-fA-F]{6}$/.test(secondary)
                        }
                        className="neon-glow-primary"
                      >
                        <Icon name="auto_awesome" className="text-sm" />
                        {isGeneratingLogo ? "Generating…" : "Generate Logo"}
                      </Button>
                      <Button variant="ghost" onClick={() => setAiLogoUrl("")} disabled={isGeneratingLogo}>
                        Clear
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="block">
                        <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          Style
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {AI_STYLES.map((s) => (
                            <Button
                              key={s.id}
                              variant={aiLogoStyle === s.id ? "primary" : "ghost"}
                              onClick={() => setAiLogoStyle(s.id)}
                              disabled={isGeneratingLogo}
                            >
                              {s.label}
                            </Button>
                          ))}
                        </div>
                      </label>

                      <Input
                        label="Monogram (1-3)"
                        value={aiMonogram}
                        onChange={(e) => setAiMonogram(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
                        placeholder="مثال: AM"
                      />
                    </div>

                    <Input
                      label="AI Logo URL (optional)"
                      value={aiLogoUrl}
                      onChange={(e) => setAiLogoUrl(e.target.value)}
                      placeholder="يتم تعبئته تلقائيًا بعد التوليد"
                    />

                    {aiLogoUrl ? (
                      <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-2xl p-5">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          Preview
                        </div>
                        <div className="mt-4 w-24 h-24 rounded-2xl border border-outline-variant/20 bg-surface/30 grid place-items-center overflow-hidden">
                          <img alt="AI logo" src={aiLogoUrl} className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-3 text-[10px] text-on-surface-variant">يتم التوليد على السيرفر (بدون مفاتيح في الفرونت).</div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-on-surface-variant">
                        التوليد يعتمد على اسم النادي + ألوان الطقم + الثيم.
                      </div>
                    )}
                    <div className="text-[10px] text-on-surface-variant">
                      لو هتولد بالـ AI: خليه على السيرفر باستخدام متغير بيئة، ما تحطش أي مفاتيح داخل الفرونت.
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  3) اختيار ألوان الفريق (Kit)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                      Primary
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-12 rounded border border-outline-variant/30 bg-transparent" />
                      <Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="#81ecff" />
                    </div>
                  </label>
                  <label className="block">
                    <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                      Secondary
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-10 w-12 rounded border border-outline-variant/30 bg-transparent" />
                      <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="#c3f400" />
                    </div>
                  </label>
                </div>
                <ShirtPreview primary={primary} secondary={secondary} />
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  4) اختيار المدير الفني (Coach)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {COACHES.map((c) => (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => setCoachType(c.type)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        coachType === c.type ? "border-primary/60 bg-surface-container-highest/70" : "border-outline-variant/20 bg-surface-container-highest/40 hover:border-primary/30"
                      }`}
                    >
                      <div className="font-headline font-black">{c.label}</div>
                      <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">{c.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-5">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  5) هوية النادي (Theme + Stadium)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        theme === t.id ? "border-primary/60 bg-surface-container-highest/70" : "border-outline-variant/20 bg-surface-container-highest/40 hover:border-primary/30"
                      }`}
                    >
                      <div className="font-headline font-black">{t.label}</div>
                      <div className="mt-2 text-[10px] text-on-surface-variant">Affects UI atmosphere</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STADIUMS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStadiumId(s.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        stadiumId === s.id
                          ? "border-secondary/60 bg-surface-container-highest/70"
                          : "border-outline-variant/20 bg-surface-container-highest/40 hover:border-secondary/30"
                      }`}
                    >
                      <div className="font-headline font-black">{s.label}</div>
                      <div className="mt-2 text-[10px] text-on-surface-variant">{s.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-2xl p-5">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Summary</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Club</span>
                  <span className="font-headline font-black truncate">{name.trim() || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Logo</span>
                  <span className="font-headline font-black">
                    {logoMode === "preset" ? presetLogoId : `${aiLogoStyle}${aiMonogram ? ` • ${aiMonogram}` : ""}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Kit</span>
                  <span className="font-headline font-black">{primary}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Coach</span>
                  <span className="font-headline font-black">{coachType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Theme</span>
                  <span className="font-headline font-black">{theme}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Stadium</span>
                  <span className="font-headline font-black">{stadiumId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || isSaving} className="w-full">
                Back
              </Button>
              {step < 5 ? (
                <Button onClick={() => setStep((s) => Math.min(5, s + 1))} disabled={!canNext || isSaving} className="w-full neon-glow-primary">
                  Next
                </Button>
              ) : (
                <Button onClick={finish} disabled={!canNext || isSaving} className="w-full neon-glow-primary">
                  {isSaving ? "Creating…" : "Create Club"}
                </Button>
              )}
            </div>

            <Button variant="ghost" onClick={() => navigate("/", { replace: true })} className="w-full" disabled={isSaving}>
              Skip (Dashboard)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
