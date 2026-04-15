import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { PlayerCard } from "../game/components/PlayerCard";

function formatTimeLeft(endsAt) {
  if (!endsAt) return "—";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "ENDED";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function effectivePrice(l) {
  if (l.type === "instant") return l.buyNowPrice ?? 0;
  return l.currentBid ?? l.startingBid ?? 0;
}

export function TransferMarket() {
  const { token, user, refreshMe } = useAuth();
  const wsRef = useRef(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialRect, setTutorialRect] = useState(null);
  const [event, setEvent] = useState(null);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pricePct, setPricePct] = useState(100);

  const [listings, setListings] = useState([]);
  const [myPlayers, setMyPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    rarity: "",
    minRating: "",
    maxRating: "",
    minPrice: "",
    maxPrice: "",
    type: "",
  });

  const [sell, setSell] = useState({
    playerId: "",
    type: "instant",
    buyNowPrice: "5000",
    startingBid: "2000",
    durationSeconds: "300",
  });

  const [bidAmountByListing, setBidAmountByListing] = useState({});
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem("stadium_os:trader_tutorial_done") === "1";
      const pending = localStorage.getItem("stadium_os:trader_tutorial_pending") === "1";
      const firstMarketShown = localStorage.getItem("stadium_os:trader_tutorial_first_market_shown") === "1";
      if (!done && pending) {
        localStorage.removeItem("stadium_os:trader_tutorial_pending");
        setTutorialStep(1);
        return;
      }
      if (!done && !pending && !firstMarketShown) {
        localStorage.setItem("stadium_os:trader_tutorial_first_market_shown", "1");
        setTutorialStep(1);
      }
    } catch {
      return;
    }
  }, []);

  const [tutorialTargetId, setTutorialTargetId] = useState(null);

  useEffect(() => {
    if (!tutorialStep) {
      setTutorialTargetId(null);
      return;
    }
    if (tutorialStep === 1) {
      setTutorialTargetId("tutorial-filters");
      return;
    }
    if (tutorialStep === 3) {
      setTutorialTargetId("tutorial-create-listing");
      return;
    }

    const decide = () => {
      if (document.getElementById("tutorial-buy-now")) return "tutorial-buy-now";
      if (document.getElementById("tutorial-bid-input")) return "tutorial-bid-input";
      return "tutorial-first-card";
    };

    const raf = requestAnimationFrame(() => setTutorialTargetId(decide()));
    return () => cancelAnimationFrame(raf);
  }, [tutorialStep, listings.length, isLoading]);

  useEffect(() => {
    if (!tutorialTargetId) {
      setTutorialRect(null);
      return;
    }

    const update = () => {
      const el = document.getElementById(tutorialTargetId);
      if (!el) {
        setTutorialRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      const pad = 10;
      setTutorialRect({
        top: Math.max(8, r.top - pad),
        left: Math.max(8, r.left - pad),
        width: Math.min(window.innerWidth - 16, r.width + pad * 2),
        height: Math.min(window.innerHeight - 16, r.height + pad * 2),
      });
    };

    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, [tutorialTargetId]);

  const closeTutorial = useCallback(() => {
    try {
      localStorage.setItem("stadium_os:trader_tutorial_done", "1");
      localStorage.removeItem("stadium_os:trader_tutorial_pending");
    } catch {
      return;
    } finally {
      setTutorialStep(0);
      setTutorialRect(null);
    }
  }, []);

  const nextTutorial = useCallback(() => {
    setTutorialStep((s) => (s >= 3 ? 0 : s + 1));
  }, []);

  const prevTutorial = useCallback(() => {
    setTutorialStep((s) => (s <= 1 ? 1 : s - 1));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredListings = useMemo(() => {
    const rarity = filters.rarity || null;
    const type = filters.type || null;
    const minRating = filters.minRating ? Number(filters.minRating) : null;
    const maxRating = filters.maxRating ? Number(filters.maxRating) : null;
    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;

    return listings
      .filter((l) => l.status === "active")
      .filter((l) => (type ? l.type === type : true))
      .filter((l) => (rarity ? l.player?.rarity === rarity : true))
      .filter((l) => (minRating !== null ? (l.player?.rating ?? 0) >= minRating : true))
      .filter((l) => (maxRating !== null ? (l.player?.rating ?? 0) <= maxRating : true))
      .filter((l) => (minPrice !== null ? effectivePrice(l) >= minPrice : true))
      .filter((l) => (maxPrice !== null ? effectivePrice(l) <= maxPrice : true))
      .sort((a, b) => effectivePrice(b) - effectivePrice(a));
  }, [listings, filters]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ status: "active" });
      const data = await apiRequest(`/api/market/listings?${query.toString()}`, { headers: authHeaders(token) });
      const mine = await apiRequest("/api/players?scope=mine", { headers: authHeaders(token) });
      setListings(data.listings);
      setMyPlayers(mine.players);
    } catch (err) {
      setError(err.message || "Failed to load market");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sell.playerId) {
        setPriceSuggestion(null);
        setPriceHistory([]);
        return;
      }
      setIsLoadingSuggestion(true);
      try {
        const data = await apiRequest(`/api/market/price-suggestion?playerId=${encodeURIComponent(sell.playerId)}`, {
          headers: authHeaders(token),
        });
        if (!cancelled) setPriceSuggestion(data);
      } catch {
        if (!cancelled) setPriceSuggestion(null);
      } finally {
        if (!cancelled) setIsLoadingSuggestion(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sell.playerId, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sell.playerId) return;
      setIsLoadingHistory(true);
      try {
        const data = await apiRequest(`/api/market/price-history?playerId=${encodeURIComponent(sell.playerId)}&days=7`, {
          headers: authHeaders(token),
        });
        if (!cancelled) setPriceHistory(data.history || []);
      } catch {
        if (!cancelled) setPriceHistory([]);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sell.playerId, token]);

  useEffect(() => {
    if (priceSuggestion) setPricePct(100);
  }, [priceSuggestion]);

  const applySuggestion = useCallback(() => {
    if (!priceSuggestion) return;
    const mult = pricePct / 100;
    const buy = Math.max(1, Math.round((priceSuggestion.suggestedBuyNow * mult) / 50) * 50);
    const start = Math.max(1, Math.round((priceSuggestion.suggestedStartingBid * mult) / 50) * 50);
    setSell((p) => {
      if (p.type === "instant") {
        return { ...p, buyNowPrice: String(buy) };
      }
      return {
        ...p,
        startingBid: String(start),
        buyNowPrice: String(buy),
      };
    });
  }, [pricePct, priceSuggestion]);

  useEffect(() => {
    if (!priceSuggestion) return;
    const mult = pricePct / 100;
    const buy = Math.max(1, Math.round((priceSuggestion.suggestedBuyNow * mult) / 50) * 50);
    const start = Math.max(1, Math.round((priceSuggestion.suggestedStartingBid * mult) / 50) * 50);
    setSell((p) => {
      if (!p.playerId) return p;
      if (p.type === "instant") return { ...p, buyNowPrice: String(buy) };
      return { ...p, startingBid: String(start), buyNowPrice: String(buy) };
    });
  }, [pricePct, priceSuggestion]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/api/events/current", { headers: authHeaders(token) });
        if (!cancelled) setEvent(data.event || null);
      } catch {
        if (!cancelled) setEvent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const url = new URL("ws://localhost:4000/ws");
    url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "market.upsert" && msg.listing) {
          setListings((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((l) => l.id === msg.listing.id);
            if (idx >= 0) next[idx] = { ...next[idx], ...msg.listing };
            else next.unshift(msg.listing);
            return next;
          });
        }
      } catch {
        return;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [token]);

  async function createListing() {
    setError(null);
    try {
      const body =
        sell.type === "instant"
          ? { playerId: sell.playerId, type: "instant", buyNowPrice: Number(sell.buyNowPrice) }
          : {
              playerId: sell.playerId,
              type: "auction",
              startingBid: Number(sell.startingBid),
              durationSeconds: Number(sell.durationSeconds),
              buyNowPrice: sell.buyNowPrice ? Number(sell.buyNowPrice) : undefined,
            };

      await apiRequest("/api/market/listings", { method: "POST", headers: authHeaders(token), json: body });
      await load();
    } catch (err) {
      setError(err.message || "Failed to create listing");
    }
  }

  async function buy(listingId) {
    setError(null);
    try {
      await apiRequest("/api/market/buy", { method: "POST", headers: authHeaders(token), json: { listingId } });
      await refreshMe();
    } catch (err) {
      setError(err.message || "Buy failed");
    }
  }

  async function bid(listingId, minSuggested) {
    setError(null);
    try {
      const amount = bidAmountByListing[listingId] ? Number(bidAmountByListing[listingId]) : minSuggested;
      await apiRequest("/api/market/bid", { method: "POST", headers: authHeaders(token), json: { listingId, amount } });
      setBidAmountByListing((p) => ({ ...p, [listingId]: "" }));
      await refreshMe();
    } catch (err) {
      setError(err.message || "Bid failed");
    }
  }

  return (
    <AppShell>
      <div className="p-8 grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        {tutorialStep ? (
          <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/65" />
            {tutorialRect ? (
              <div
                className="fixed pointer-events-none border-2 border-primary/70 rounded-2xl shadow-[0_0_50px_rgba(129,236,255,0.25)]"
                style={{
                  top: `${tutorialRect.top}px`,
                  left: `${tutorialRect.left}px`,
                  width: `${tutorialRect.width}px`,
                  height: `${tutorialRect.height}px`,
                }}
              />
            ) : null}

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(620px,calc(100%-24px))]">
              <div className="glass-card rounded-2xl p-5 border border-outline-variant/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                      Trader Tutorial • Step {tutorialStep} / 3
                    </div>
                    {tutorialStep === 1 ? (
                      <div className="mt-2 text-sm text-on-surface">
                        استخدم الفلاتر عشان تلاقي صفقات بسرعة: Rating / Price / Rarity / Type.
                      </div>
                    ) : tutorialStep === 2 ? (
                      <div className="mt-2 text-sm text-on-surface">
                        اشترِ فورًا (Buy Now) أو ادخل مزاد (Bid). القاعدة: أعلى مزايدة تفوز.
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-on-surface">
                        اعرض لاعب للبيع: اختر لاعبك، حدد السعر (أو مزاد)، ثم Create Listing.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeTutorial}
                    className="p-2 text-[#f1f3fc]/60 hover:text-primary hover:bg-[#20262f]/50 transition-all active:scale-95"
                  >
                    <Icon name="close" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={prevTutorial} disabled={tutorialStep === 1}>
                      Back
                    </Button>
                    <Button variant="ghost" onClick={closeTutorial}>
                      Skip
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      if (tutorialStep === 3) closeTutorial();
                      else nextTutorial();
                    }}
                    className="neon-glow-primary"
                  >
                    {tutorialStep === 3 ? "Finish" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="glass-card rounded-xl p-6 flex items-center justify-between">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Transfer Market</h1>
              <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Real-time listings, instant buy, and auctions
              </div>
              {event ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-highest/40">
                  <Icon name="celebration" className="text-secondary text-sm" />
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Event: <span className="text-on-surface">{event.name}</span> • Fee {event.marketFeePercent}% • Index ×{Number(event.marketIndexMultiplier || 1).toFixed(2)}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
                <Icon name="monetization_on" className="text-secondary text-sm" />
                <span className="font-headline font-bold text-sm tracking-tight">{user?.coins?.toLocaleString?.() ?? "—"}</span>
              </div>
              <Button onClick={load} disabled={isLoading} className="px-5 py-4 text-xs">
                <Icon name="refresh" className="text-sm" />
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <div className="glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <section id="tutorial-filters" className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-black text-lg tracking-tight uppercase">Listings</h2>
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Showing {filteredListings.length}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Rarity" value={filters.rarity} onChange={(e) => setFilters((p) => ({ ...p, rarity: e.target.value }))} placeholder="common|rare|epic|legendary" />
              <Input label="Type" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))} placeholder="instant|auction" />
              <Input label="Min Rating" value={filters.minRating} onChange={(e) => setFilters((p) => ({ ...p, minRating: e.target.value }))} type="number" min="1" max="99" />
              <Input label="Max Rating" value={filters.maxRating} onChange={(e) => setFilters((p) => ({ ...p, maxRating: e.target.value }))} type="number" min="1" max="99" />
              <Input label="Min Price" value={filters.minPrice} onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))} type="number" min="1" />
              <Input label="Max Price" value={filters.maxPrice} onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))} type="number" min="1" />
            </div>

            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="text-sm text-on-surface-variant">Loading…</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-sm text-on-surface-variant">No listings match your filters.</div>
              ) : (
                filteredListings.map((l, idx) => {
                  const minBid = (l.currentBid ?? l.startingBid ?? 0) + 50;
                  return (
                    <div
                      key={l.id}
                      id={idx === 0 ? "tutorial-first-card" : undefined}
                      className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="shrink-0">{l.player ? <PlayerCard player={l.player} variant="compact" /> : null}</div>
                          <div className="min-w-0">
                            <div className="font-headline font-black truncate">{l.player?.name || "Unknown Player"}</div>
                            <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                              {l.player?.rarity || "—"} • {l.player?.rating || "—"} OVR • {l.type.toUpperCase()}
                            </div>
                            <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest truncate">
                              {[l.player?.position, l.player?.clubName].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-headline font-black text-2xl text-primary tracking-tighter">
                            {effectivePrice(l).toLocaleString?.()}
                          </div>
                          <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            {l.type === "auction" ? `Ends ${formatTimeLeft(l.endsAt)}` : "Buy Now"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        {l.type === "instant" ? (
                          <Button
                            id={idx === 0 ? "tutorial-buy-now" : undefined}
                            onClick={() => buy(l.id)}
                            className="px-5 py-3 text-xs neon-glow-primary"
                          >
                            <Icon name="shopping_cart" className="text-sm" />
                            Buy
                          </Button>
                        ) : (
                          <>
                            <Input
                              id={idx === 0 ? "tutorial-bid-input" : undefined}
                              label={`Bid (min ${minBid})`}
                              value={bidAmountByListing[l.id] ?? ""}
                              onChange={(e) => setBidAmountByListing((p) => ({ ...p, [l.id]: e.target.value }))}
                              type="number"
                              min={minBid}
                              className="max-w-[220px]"
                            />
                            <Button
                              id={idx === 0 ? "tutorial-place-bid" : undefined}
                              onClick={() => bid(l.id, minBid)}
                              className="px-5 py-3 text-xs"
                            >
                              <Icon name="gavel" className="text-sm" />
                              Place Bid
                            </Button>
                            {l.buyNowPrice ? (
                              <Button onClick={() => buy(l.id)} variant="ghost" className="px-5 py-3 text-xs">
                                <Icon name="flash_on" className="text-sm" />
                                Buy Now ({l.buyNowPrice.toLocaleString?.()})
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <section id="tutorial-sell" className="glass-card rounded-xl p-6">
            <h2 className="font-headline font-black text-lg tracking-tight uppercase">List Player</h2>
            <div className="mt-6 space-y-4">
              <label className="block">
                <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Player
                </div>
                <select
                  id="tutorial-sell-player"
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={sell.playerId}
                  onChange={(e) => setSell((p) => ({ ...p, playerId: e.target.value }))}
                >
                  <option value="">Select a player</option>
                  {myPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rating} {p.rarity})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="mb-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Type
                </div>
                <select
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={sell.type}
                  onChange={(e) => setSell((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="instant">Instant</option>
                  <option value="auction">Auction</option>
                </select>
              </label>

              {sell.type === "instant" ? (
                <>
                  {sell.playerId ? (
                    <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            Suggested Price
                          </div>
                          <div className="mt-2 font-headline font-black text-2xl text-secondary tracking-tighter">
                            {isLoadingSuggestion ? "…" : priceSuggestion?.suggestedBuyNow?.toLocaleString?.() ?? "—"}
                          </div>
                          {priceSuggestion ? (
                            <div className="mt-2 text-[10px] text-on-surface-variant">
                              Index ×{Number(priceSuggestion.marketIndexMultiplier).toFixed(2)} • Fee {priceSuggestion.marketFeePercent}%
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] text-on-surface-variant">—</div>
                          )}
                        </div>
                        <Button onClick={applySuggestion} disabled={!priceSuggestion || isLoadingSuggestion} className="px-4 py-3 text-xs">
                          <Icon name="auto_fix_high" className="text-sm" />
                          Use
                        </Button>
                      </div>
                      {priceSuggestion ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            <span>Range</span>
                            <span className="text-on-surface">{pricePct}%</span>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="140"
                            step="5"
                            value={pricePct}
                            onChange={(e) => setPricePct(Number(e.target.value))}
                            className="mt-2 w-full"
                          />
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant={pricePct === 80 ? "primary" : "ghost"} onClick={() => setPricePct(80)} className="px-3 py-2 text-xs">
                              Cheap
                            </Button>
                            <Button variant={pricePct === 100 ? "primary" : "ghost"} onClick={() => setPricePct(100)} className="px-3 py-2 text-xs">
                              Market
                            </Button>
                            <Button variant={pricePct === 120 ? "primary" : "ghost"} onClick={() => setPricePct(120)} className="px-3 py-2 text-xs">
                              Premium
                            </Button>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          Price History (7d)
                        </div>
                        <div className="mt-3 grid grid-cols-7 gap-2 items-end">
                          {(() => {
                            const max = Math.max(1, ...priceHistory.map((h) => h.avgPrice || 0));
                            const days = [...priceHistory].reverse();
                            if (days.length === 0) {
                              return (
                                <div className="col-span-7 text-[10px] text-on-surface-variant">
                                  {isLoadingHistory ? "Loading…" : "No history yet"}
                                </div>
                              );
                            }
                            return days.map((h) => (
                              <div key={h.day} className="flex flex-col items-center gap-1">
                                <div
                                  className="w-full rounded bg-primary/30 border border-primary/25"
                                  style={{ height: `${Math.max(6, Math.round(((h.avgPrice || 0) / max) * 64))}px` }}
                                  title={`${h.day}\nAvg: ${(h.avgPrice ?? 0).toLocaleString?.()}\nMin: ${(h.minPrice ?? 0).toLocaleString?.()}\nMax: ${(h.maxPrice ?? 0).toLocaleString?.()}\nLast: ${(h.lastPrice ?? 0).toLocaleString?.()}\nVol: ${(h.count ?? 0).toLocaleString?.()}`}
                                />
                                <div className="text-[9px] text-on-surface-variant">{h.day.slice(5)}</div>
                              </div>
                            ));
                          })()}
                        </div>
                        {priceHistory.length > 0 ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-3">
                              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                                Volume
                              </div>
                              <div className="mt-1 font-headline font-black text-on-surface">
                                {priceHistory.reduce((acc, h) => acc + (h.count || 0), 0)}
                              </div>
                            </div>
                            <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-3">
                              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                                Last Sold
                              </div>
                              <div className="mt-1 font-headline font-black text-secondary">
                                {(priceHistory[0]?.lastPrice ?? 0).toLocaleString?.()}
                              </div>
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  className="px-3 py-2 text-xs"
                                  onClick={() =>
                                    setSell((p) =>
                                      p.type === "instant"
                                        ? { ...p, buyNowPrice: String(priceHistory[0]?.lastPrice ?? "") }
                                        : { ...p, buyNowPrice: String(priceHistory[0]?.lastPrice ?? ""), startingBid: String(Math.round(((priceHistory[0]?.lastPrice ?? 0) * 0.8) / 50) * 50) }
                                    )
                                  }
                                >
                                  Use Last
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <Input
                    label="Buy Now Price"
                    value={sell.buyNowPrice}
                    onChange={(e) => setSell((p) => ({ ...p, buyNowPrice: e.target.value }))}
                    type="number"
                    min="1"
                  />
                </>
              ) : (
                <>
                  {sell.playerId ? (
                    <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            Suggested
                          </div>
                          <div className="mt-2 text-sm text-on-surface-variant">
                            Start{" "}
                            <span className="text-on-surface font-headline font-black">
                              {isLoadingSuggestion ? "…" : priceSuggestion?.suggestedStartingBid?.toLocaleString?.() ?? "—"}
                            </span>{" "}
                            • Buy{" "}
                            <span className="text-on-surface font-headline font-black">
                              {isLoadingSuggestion ? "…" : priceSuggestion?.suggestedBuyNow?.toLocaleString?.() ?? "—"}
                            </span>
                          </div>
                          {priceSuggestion ? (
                            <div className="mt-2 text-[10px] text-on-surface-variant">
                              Index ×{Number(priceSuggestion.marketIndexMultiplier).toFixed(2)} • Fee {priceSuggestion.marketFeePercent}%
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] text-on-surface-variant">—</div>
                          )}
                        </div>
                        <Button onClick={applySuggestion} disabled={!priceSuggestion || isLoadingSuggestion} className="px-4 py-3 text-xs">
                          <Icon name="auto_fix_high" className="text-sm" />
                          Use
                        </Button>
                      </div>
                      {priceSuggestion ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                            <span>Range</span>
                            <span className="text-on-surface">{pricePct}%</span>
                          </div>
                          <input
                            type="range"
                            min="60"
                            max="140"
                            step="5"
                            value={pricePct}
                            onChange={(e) => setPricePct(Number(e.target.value))}
                            className="mt-2 w-full"
                          />
                        </div>
                      ) : null}
                      <div className="mt-4">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          Price History (7d)
                        </div>
                        <div className="mt-3 grid grid-cols-7 gap-2 items-end">
                          {(() => {
                            const max = Math.max(1, ...priceHistory.map((h) => h.avgPrice || 0));
                            const days = [...priceHistory].reverse();
                            if (days.length === 0) {
                              return (
                                <div className="col-span-7 text-[10px] text-on-surface-variant">
                                  {isLoadingHistory ? "Loading…" : "No history yet"}
                                </div>
                              );
                            }
                            return days.map((h) => (
                              <div key={h.day} className="flex flex-col items-center gap-1">
                                <div
                                  className="w-full rounded bg-primary/30 border border-primary/25"
                                  style={{ height: `${Math.max(6, Math.round(((h.avgPrice || 0) / max) * 64))}px` }}
                                  title={`${h.day}\nAvg: ${(h.avgPrice ?? 0).toLocaleString?.()}\nMin: ${(h.minPrice ?? 0).toLocaleString?.()}\nMax: ${(h.maxPrice ?? 0).toLocaleString?.()}\nLast: ${(h.lastPrice ?? 0).toLocaleString?.()}\nVol: ${(h.count ?? 0).toLocaleString?.()}`}
                                />
                                <div className="text-[9px] text-on-surface-variant">{h.day.slice(5)}</div>
                              </div>
                            ));
                          })()}
                        </div>
                        {priceHistory.length > 0 ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-3">
                              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                                Volume
                              </div>
                              <div className="mt-1 font-headline font-black text-on-surface">
                                {priceHistory.reduce((acc, h) => acc + (h.count || 0), 0)}
                              </div>
                            </div>
                            <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-3">
                              <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                                Last Sold
                              </div>
                              <div className="mt-1 font-headline font-black text-secondary">
                                {(priceHistory[0]?.lastPrice ?? 0).toLocaleString?.()}
                              </div>
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  className="px-3 py-2 text-xs"
                                  onClick={() =>
                                    setSell((p) =>
                                      p.type === "instant"
                                        ? { ...p, buyNowPrice: String(priceHistory[0]?.lastPrice ?? "") }
                                        : { ...p, buyNowPrice: String(priceHistory[0]?.lastPrice ?? ""), startingBid: String(Math.round(((priceHistory[0]?.lastPrice ?? 0) * 0.8) / 50) * 50) }
                                    )
                                  }
                                >
                                  Use Last
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <Input label="Starting Bid" value={sell.startingBid} onChange={(e) => setSell((p) => ({ ...p, startingBid: e.target.value }))} type="number" min="1" />
                  <Input
                    label="Duration (seconds)"
                    value={sell.durationSeconds}
                    onChange={(e) => setSell((p) => ({ ...p, durationSeconds: e.target.value }))}
                    type="number"
                    min="30"
                    max="3600"
                  />
                  <Input
                    label="Buy Now Price (optional)"
                    value={sell.buyNowPrice}
                    onChange={(e) => setSell((p) => ({ ...p, buyNowPrice: e.target.value }))}
                    type="number"
                    min="1"
                  />
                </>
              )}

              <Button
                id="tutorial-create-listing"
                onClick={createListing}
                disabled={!sell.playerId}
                className="w-full neon-glow-primary px-5 py-4 text-xs"
              >
                <Icon name="sell" className="text-sm" />
                Create Listing
              </Button>
            </div>
          </section>

          <section className="glass-card rounded-xl p-6">
            <h2 className="font-headline font-black text-lg tracking-tight uppercase">Real-time</h2>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <Icon name="wifi" className="text-primary text-sm" />
                WebSocket connected: {wsRef.current ? "yes" : "no"}
              </div>
              <div className="flex items-center gap-2">
                <Icon name="shield" className="text-primary text-sm" />
                Server validates ownership, coins, min bid increments, and auction timeouts
              </div>
              <div className="flex items-center gap-2">
                <Icon name="swap_horiz" className="text-primary text-sm" />
                Coins + ownership updates run in MongoDB transactions
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
