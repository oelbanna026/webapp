import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { apiRequest, authHeaders } from "../lib/api";

function byName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

export function ScoutingImport() {
  const { token, refreshMe } = useAuth();
  const [season, setSeason] = useState(2023);
  const [leagueImportLimit, setLeagueImportLimit] = useState(6);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [leagueId, setLeagueId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingLeague, setIsImportingLeague] = useState(false);
  const [leagueJobId, setLeagueJobId] = useState(null);
  const [leagueJob, setLeagueJob] = useState(null);
  const [result, setResult] = useState(null);
  const [scouting, setScouting] = useState(null);
  const [scoutResult, setScoutResult] = useState(null);
  const [isScouting, setIsScouting] = useState(false);
  const [error, setError] = useState(null);

  const leagueOptions = useMemo(() => {
    return leagues
      .map((x) => ({
        id: x.league?.id,
        name: x.league?.name,
        country: x.country?.name,
      }))
      .filter((x) => x.id)
      .sort((a, b) => byName(a, b));
  }, [leagues]);

  const teamOptions = useMemo(() => {
    return teams
      .map((x) => ({
        id: x.team?.id,
        name: x.team?.name,
      }))
      .filter((x) => x.id)
      .sort((a, b) => byName(a, b));
  }, [teams]);

  const loadLeagues = useCallback(async () => {
    setIsLoadingLeagues(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/import/football/leagues?season=${encodeURIComponent(season)}`, { headers: authHeaders(token) });
      setLeagues(data.leagues || []);
    } catch (err) {
      setError(err.message || "فشل تحميل الدوريات");
      setLeagues([]);
    } finally {
      setIsLoadingLeagues(false);
    }
  }, [season, token]);

  const loadTeams = useCallback(async () => {
    if (!leagueId) return;
    setIsLoadingTeams(true);
    setError(null);
    try {
      const data = await apiRequest(
        `/api/import/football/teams?leagueId=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(season)}`,
        { headers: authHeaders(token) }
      );
      setTeams(data.teams || []);
    } catch (err) {
      setError(err.message || "فشل تحميل الفرق");
      setTeams([]);
    } finally {
      setIsLoadingTeams(false);
    }
  }, [leagueId, season, token]);

  useEffect(() => {
    loadLeagues();
  }, [loadLeagues]);

  const loadScouting = useCallback(async () => {
    try {
      const data = await apiRequest("/api/scouting/me", { headers: authHeaders(token) });
      setScouting(data);
    } catch {
      setScouting(null);
    }
  }, [token]);

  useEffect(() => {
    loadScouting();
  }, [loadScouting]);

  useEffect(() => {
    setTeams([]);
    setTeamId("");
    if (leagueId) loadTeams();
  }, [leagueId, loadTeams]);

  async function runImport() {
    setIsImporting(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest(
        `/api/import/football/team/${encodeURIComponent(teamId)}?season=${encodeURIComponent(season)}&leagueId=${encodeURIComponent(leagueId)}`,
        { method: "POST", headers: authHeaders(token), json: {} }
      );
      setResult(data);
    } catch (err) {
      setError(err.message || "فشل الاستيراد");
    } finally {
      setIsImporting(false);
    }
  }

  async function openScout(mode) {
    setIsScouting(true);
    setError(null);
    try {
      const data = await apiRequest("/api/scouting/open", { method: "POST", headers: authHeaders(token), json: { mode } });
      setScoutResult(data);
      await Promise.all([loadScouting(), refreshMe()]);
    } catch (err) {
      setError(err.message || "فشل الكشف");
    } finally {
      setIsScouting(false);
    }
  }

  const pollJob = useCallback(async () => {
    if (!leagueJobId) return;
    try {
      const data = await apiRequest(`/api/import/jobs/${encodeURIComponent(leagueJobId)}`, { headers: authHeaders(token) });
      setLeagueJob(data);
      if (data.status === "completed" || data.status === "failed") setIsImportingLeague(false);
    } catch (err) {
      setError(err.message || "فشل متابعة مهمة الاستيراد");
      setIsImportingLeague(false);
    }
  }, [leagueJobId, token]);

  useEffect(() => {
    if (!leagueJobId) return;
    const t = setInterval(() => pollJob(), 2000);
    pollJob();
    return () => clearInterval(t);
  }, [leagueJobId, pollJob]);

  async function runLeagueImport() {
    setIsImportingLeague(true);
    setError(null);
    setLeagueJob(null);
    setResult(null);
    try {
      const limit = Number(leagueImportLimit);
      const limitParam = Number.isFinite(limit) && limit > 0 ? `&limit=${encodeURIComponent(Math.floor(limit))}` : "";
      const data = await apiRequest(
        `/api/import/football/league/${encodeURIComponent(leagueId)}?season=${encodeURIComponent(season)}${limitParam}`,
        { method: "POST", headers: authHeaders(token), json: {} }
      );
      setLeagueJobId(data.jobId);
    } catch (err) {
      setError(err.message || "فشل استيراد الدوري");
      setIsImportingLeague(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="glass-card rounded-xl p-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-headline font-black text-2xl tracking-tight uppercase">استيراد اللاعبين (Scouting)</h1>
            <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              API‑FOOTBALL → Transform → Database → Packs
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={loadLeagues} disabled={isLoadingLeagues} variant="ghost" className="px-5 py-3 text-xs">
              <Icon name="refresh" className="text-sm" />
              {isLoadingLeagues ? "جاري…" : "تحديث"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
            <Icon name="error" className="text-sm" />
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">الكشف اليومي</div>
                  <div className="mt-2 text-sm text-on-surface-variant">
                    {scouting ? (
                      <>
                        Tokens: <span className="text-on-surface font-headline font-black">{scouting.tokens}</span>/
                        {scouting.cap} • Reset: <span className="text-on-surface">{new Date(scouting.nextResetAt).toLocaleTimeString?.()}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <Button onClick={loadScouting} variant="ghost" className="px-4 py-2 text-xs">
                  <Icon name="refresh" className="text-sm" />
                  تحديث
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => openScout("standard")}
                  disabled={isScouting || !(scouting?.tokens > 0) || scouting?.canScout === false}
                  className="px-5 py-3 text-xs neon-glow-primary"
                >
                  <Icon name="search" className="text-sm" />
                  كشف عادي
                </Button>
                <Button
                  onClick={() => openScout("premium")}
                  disabled={isScouting || !(scouting?.tokens > 0) || scouting?.canScout === false}
                  variant="ghost"
                  className="px-5 py-3 text-xs"
                >
                  <Icon name="monetization_on" className="text-sm" filled />
                  كشف بريميوم
                </Button>
              </div>
              {scouting?.canScout === false ? (
                <div className="mt-4 text-[10px] text-on-surface-variant">
                  لا يوجد لاعبون مستوردون بعد. استخدم استيراد فريق/دوري أولاً ثم جرّب الكشف.
                </div>
              ) : null}

              {scoutResult?.player ? (
                <div className="mt-6 bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-headline font-black truncate">{scoutResult.player.name}</div>
                      <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">
                        {scoutResult.player.rarity} • {scoutResult.player.rating} OVR
                      </div>
                      {scoutResult.player.nation || scoutResult.player.clubName ? (
                        <div className="mt-2 text-[10px] text-on-surface-variant truncate">
                          {[scoutResult.player.nation, scoutResult.player.clubName].filter(Boolean).join(" • ")}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-on-surface-variant uppercase tracking-widest">Result</div>
                      <div className={`mt-1 text-xs font-headline font-black ${scoutResult.duplicate ? "text-secondary" : "text-primary"}`}>
                        {scoutResult.duplicate ? `Duplicate +${scoutResult.coinsAwarded}` : "New"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">الموسم</div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={season}
                  onChange={(e) => setSeason(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 font-headline font-black tracking-tight text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
                <Button onClick={loadLeagues} disabled={isLoadingLeagues} className="px-5 py-3 text-xs neon-glow-primary">
                  <Icon name="search" className="text-sm" />
                  تحميل
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">حد فرق الدوري</div>
                <div className="text-[10px] text-on-surface-variant">0 = الكل</div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={leagueImportLimit}
                  onChange={(e) => setLeagueImportLimit(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 font-headline font-black tracking-tight text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <div className="mt-3 text-[10px] text-on-surface-variant">
                لو حسابك في API‑FOOTBALL محدود، ابدأ بـ 4–8 فرق ثم زود تدريجيًا.
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">الدوري</div>
              <select
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              >
                <option value="">اختر دوري…</option>
                {leagueOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.country ? `(${l.country})` : ""}
                  </option>
                ))}
              </select>
              <div className="mt-3 text-[10px] text-on-surface-variant">
                {isLoadingLeagues ? "جاري تحميل الدوريات…" : `${leagueOptions.length} دوري`}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">الفريق</div>
                <Button onClick={loadTeams} disabled={!leagueId || isLoadingTeams} variant="ghost" className="px-4 py-2 text-xs">
                  <Icon name="refresh" className="text-sm" />
                  فرق
                </Button>
              </div>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
                disabled={!leagueId}
              >
                <option value="">{leagueId ? "اختر فريق…" : "اختر دوري أولاً"}</option>
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 text-[10px] text-on-surface-variant">{isLoadingTeams ? "جاري تحميل الفرق…" : `${teamOptions.length} فريق`}</div>
            </div>

            <Button onClick={runImport} disabled={!teamId || !leagueId || isImporting} className="w-full px-6 py-4 text-xs neon-glow-primary">
              <Icon name="cloud_download" className="text-sm" />
              {isImporting ? "جاري الاستيراد…" : "استيراد لاعبي الفريق"}
            </Button>

            <Button onClick={runLeagueImport} disabled={!leagueId || isImportingLeague} variant="ghost" className="w-full px-6 py-4 text-xs">
              <Icon name="hub" className="text-sm" />
              {isImportingLeague ? "جاري استيراد الدوري…" : "استيراد الدوري بالكامل (مهمة)"}
            </Button>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-6">
            {leagueJob ? (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">مهمة استيراد الدوري</div>
                  <div className="text-[10px] text-on-surface-variant">{leagueJob.status}</div>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${leagueJob.progress.total ? Math.round((leagueJob.progress.done / leagueJob.progress.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-on-surface-variant">
                    {leagueJob.progress.done}/{leagueJob.progress.total}
                  </div>
                </div>
                {leagueJob.error ? (
                  <div className="mt-4 text-[10px] text-error">{leagueJob.error}</div>
                ) : null}
                {leagueJob.results?.length ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {leagueJob.results.slice(-10).reverse().map((r, idx) => (
                      <div key={idx} className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-3 text-[10px]">
                        <div className="text-on-surface-variant uppercase tracking-widest">Team {r.teamId}</div>
                        {r.ok === false ? (
                          <div className="mt-1 text-error truncate">{r.error || "Failed"}</div>
                        ) : (
                          <div className="mt-1 text-on-surface">
                            fetched {r.fetched} • upserted {r.upserted}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="glass-card rounded-xl p-6">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">نتيجة استيراد الفريق</div>
              {result ? (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-surface-container-low p-4 border-l-2 border-primary/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">تم جلب</div>
                    <div className="mt-1 font-headline font-black text-primary">{result.fetched}</div>
                  </div>
                  <div className="bg-surface-container-low p-4 border-l-2 border-secondary/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">تم حفظ/تحديث</div>
                    <div className="mt-1 font-headline font-black text-secondary">{result.upserted}</div>
                  </div>
                  <div className="bg-surface-container-low p-4 border-l-2 border-outline/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">الموسم</div>
                    <div className="mt-1 font-headline font-black text-on-surface">{result.season}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-on-surface-variant">اختر دوري + فريق ثم اضغط Import.</div>
              )}
            </div>

            {result?.templates?.length ? (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Imported Templates</div>
                  <div className="text-[10px] text-on-surface-variant">{result.templates.length}</div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.templates.slice(0, 20).map((p) => (
                    <div key={p.templateKey} className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                      <div className="font-headline font-black truncate">{p.name}</div>
                      <div className="mt-2 text-[10px] text-on-surface-variant uppercase tracking-widest">
                        {p.rarity} • {p.rating} OVR
                      </div>
                      <div className="mt-2 text-[10px] text-on-surface-variant truncate">{p.templateKey}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
