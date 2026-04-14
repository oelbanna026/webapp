import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { AppShell } from "../components/layout/AppShell";

export function Dashboard() {
  return (
    <AppShell>
      <div className="p-8 grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section className="relative overflow-hidden h-[400px] rounded-xl flex flex-col justify-end p-10 group">
            <img
              alt="featured match"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuApc7vlXCkGwVUgfIdGqpp8FmvShY_F4tsUra_oPJTKLuf00j-MMFy-VOAVZZ6o0NsEt3LDgMiVMgFmMPVttwA3knnoy5vaMACK2EWq2hc7dZxuaOyX84tpIJDh97MholZe-aGAvc95oKPqFVA78XQ5CuNacHWXC1WTttuZVjsjZlIZkV6jT-4OslYk0fy8xrnjviFaqE1IRQiwHyp-9zShHyv-CtXsGyyJl3HDyOXqemLiCG8fSpH_2zDpgoElS2M592wCleeh6Fg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-primary text-on-primary font-headline text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">
                  LIVE NOW
                </span>
                <span className="text-on-surface font-headline font-bold text-sm">CHAMPIONS TOURNAMENT</span>
              </div>
              <h1 className="text-6xl font-black font-headline tracking-tighter mb-8 leading-none">
                THE FINAL
                <br />
                <span className="text-primary">FRONTIER</span>
              </h1>
              <div className="flex flex-wrap gap-4">
                <Link to="/live">
                  <Button
                    className="px-8 py-4 text-xs neon-glow-primary rounded-lg normal-case tracking-normal"
                    variant="primary"
                  >
                    <Icon name="sports_soccer" filled />
                    PLAY MATCH
                  </Button>
                </Link>
                <Link to="/packs">
                  <Button className="px-8 py-4 text-xs rounded-lg normal-case tracking-normal" variant="ghost">
                    <Icon name="package_2" filled />
                    OPEN PACK
                  </Button>
                </Link>
                <Link to="/market">
                  <Button className="px-8 py-4 text-xs rounded-lg normal-case tracking-normal" variant="ghost">
                    <Icon name="currency_exchange" />
                    TRANSFER MARKET
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card rounded-xl p-6 flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-headline font-black text-2xl tracking-tight uppercase">Galactic United</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-widest">
                      Division 1 Elite
                    </span>
                  </div>
                </div>
                <div className="bg-primary-container/20 border border-primary/30 p-4 rounded-lg text-center">
                  <p className="text-[10px] font-headline font-black text-primary uppercase">Rating</p>
                  <p className="text-4xl font-black font-headline text-primary tracking-tighter">88</p>
                </div>
              </div>
              <div className="flex items-end justify-between mt-6">
                <div className="flex -space-x-3">
                  <img
                    alt="player 1"
                    className="w-10 h-10 rounded-full border-2 border-surface-container-highest object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaj90kaQM6VZTURJG9h0inrLvGN45gl5T4MmefKX4HuDlrLIM-xRxEibmhNq6x5anXzzZl4ZRrlGV3mj-0Ab7bHUGyFou811EkomYekHn1xfm_Y7iB9db7RsaObfo_XBDYfGfLMDe1HQzbDGQhaxswSi81Ku4LqNf2kqlmDG4SNHc87h5JT6wZH_5myq6EOMyX95Slo-Kontd53ILKDjEWQ5CCRbduOJtk74-w1TTTWy5rJcrXuRrH_dnchJqIkqZZ81Tx8Mo_MPg"
                  />
                  <img
                    alt="player 2"
                    className="w-10 h-10 rounded-full border-2 border-surface-container-highest object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBITGdUNZNcYFjB0vHJw92mIorqJpAaVNpG5pTz-fAeMBVSz-arLcd12Tqrf0dO0tRM8x8FlUGt67hD6bLRBcqrN-z_2ywzuSKXxsEixREU2Ke57y_zZTlzQtWJL4IJISdQWEfo3-p94Am-YCYJCDEURSodn86nHCiAidZ1eggOadIYKhNDDVFWQV2zQIeEqJdYWKQfoa-oI9OP1IlwoWQDMO54R0XwGpe6dU2dG5WF0VhCDbErzYWaqP8iueOxMyC1ONjaZXBOCBU"
                  />
                  <img
                    alt="player 3"
                    className="w-10 h-10 rounded-full border-2 border-surface-container-highest object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwELvRKoeJqg8RMDuZnwj9E0PAQe5_0UI3RbyQu4CRpZGPYAMQ4I4Q72Kj6hiyTeIZcj5eDuyPOewKxlOlzITid6AxASwXRICigO7VWjysnbd5HiZPwdfJUd70xc2wWPVkcuuIZDlQzcB4fCMXMB2Gf2BwNobacraplieTfDMMtxGZoiEplZ9wNlSc_GvayjA1yQIoQxDGId0PUnqr9_-0cPcX4cBHbWKpTnut6eZfDctWUUA0G9U-iB43vHByE1wX1DMpioOgVl8"
                  />
                  <div className="w-10 h-10 rounded-full border-2 border-surface-container-highest bg-surface-bright flex items-center justify-center text-[10px] font-bold font-headline">
                    +8
                  </div>
                </div>
                <Link to="/squad" className="text-primary font-headline font-bold text-xs flex items-center gap-1 hover:underline">
                  MANAGE SQUAD <Icon name="chevron_right" className="text-sm" />
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 relative overflow-hidden min-h-[220px]">
              <div className="flex justify-between items-center mb-4">
                <span className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                  Active Tactics
                </span>
                <span className="bg-surface-bright text-on-surface px-3 py-1 rounded font-headline font-black text-sm">
                  4-3-3
                </span>
              </div>
              <div className="flex justify-center items-center h-24 relative">
                <div className="absolute inset-0 border border-outline-variant/10 rounded-lg" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-outline-variant/10" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-outline-variant/10 rounded-full" />
                <div className="flex flex-col gap-6 w-full px-4 relative z-10">
                  <div className="flex justify-around">
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#81ecff]" />
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#81ecff]" />
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#81ecff]" />
                  </div>
                  <div className="flex justify-around">
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#81ecff]" />
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                  </div>
                  <div className="flex justify-around">
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="w-2 h-2 rounded-full bg-primary/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <section className="glass-card rounded-xl p-6 border-l-4 border-l-secondary">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline font-black text-lg tracking-tight uppercase">Daily Progress</h3>
                <p className="text-[10px] font-headline font-bold text-secondary uppercase tracking-widest">Streak: 04 Days</p>
              </div>
              <Icon name="redeem" className="text-secondary" />
            </div>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-secondary/10 border border-secondary/30 h-10 rounded flex items-center justify-center">
                  <Icon name="check" className="text-secondary text-sm" />
                </div>
              ))}
              <div className="bg-surface-bright border border-outline-variant/30 h-10 rounded flex items-center justify-center group cursor-pointer hover:border-secondary transition-all">
                <span className="text-[10px] font-headline font-black text-on-surface-variant group-hover:text-secondary">D5</span>
              </div>
            </div>
            <div className="bg-surface-container-highest rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary-dim rounded rotate-45 flex items-center justify-center -ml-6 border border-on-secondary/20">
                <Icon name="diamond" className="text-on-secondary -rotate-45" filled />
              </div>
              <div>
                <p className="text-[10px] font-headline font-bold text-on-surface-variant uppercase">Current Reward</p>
                <p className="font-headline font-black text-sm">PREMIUM PACK TIER 1</p>
              </div>
              <Button className="ml-auto px-3 py-1" variant="secondary">
                CLAIM
              </Button>
            </div>
          </section>

          <section className="glass-card rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-black text-lg tracking-tight uppercase">Tactical Missions</h3>
              <Icon name="assignment" className="text-on-surface-variant" />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-headline">
                  <span className="font-bold text-on-surface uppercase tracking-wider">Score 3 goals</span>
                  <span className="font-black text-primary">2 / 3</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-2/3" />
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="monetization_on" className="text-[10px] text-secondary" />
                  <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase">5,000 Credits</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-headline">
                  <span className="font-bold text-on-surface uppercase tracking-wider">Win a match</span>
                  <span className="font-black text-primary">0 / 1</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-0" />
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="database" className="text-[10px] text-primary" />
                  <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase">20 Gems</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-headline">
                  <span className="font-bold text-on-surface uppercase tracking-wider">Complete 50 Passes</span>
                  <span className="font-black text-primary">50 / 50</span>
                </div>
                <div className="w-full bg-secondary/20 h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full w-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Icon name="stars" className="text-[10px] text-secondary" filled />
                    <span className="text-[10px] font-headline font-bold text-on-surface-variant uppercase">Expert XP</span>
                  </div>
                  <span className="text-[8px] font-headline font-black text-secondary uppercase">COMPLETED</span>
                </div>
              </div>
            </div>

            <button className="w-full mt-8 border border-outline-variant/30 py-3 rounded font-headline font-black text-[10px] tracking-widest text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all uppercase">
              View All Missions
            </button>
          </section>

          <section className="glass-card rounded-xl p-6 overflow-hidden relative">
            <h3 className="font-headline font-black text-xs tracking-widest text-on-surface-variant uppercase mb-4">
              League Momentum
            </h3>
            <div className="h-24 flex items-end gap-1">
              <div className="flex-1 bg-gradient-to-t from-primary/20 to-primary/40 rounded-t-sm h-[40%]" />
              <div className="flex-1 bg-gradient-to-t from-primary/20 to-primary/40 rounded-t-sm h-[60%]" />
              <div className="flex-1 bg-gradient-to-t from-primary/20 to-primary/40 rounded-t-sm h-[35%]" />
              <div className="flex-1 bg-gradient-to-t from-primary/20 to-primary/40 rounded-t-sm h-[85%]" />
              <div className="flex-1 bg-gradient-to-t from-secondary/40 to-secondary rounded-t-sm shadow-[0_0_10px_rgba(195,244,0,0.3)] h-full" />
              <div className="flex-1 bg-surface-container-highest rounded-t-sm h-[20%]" />
              <div className="flex-1 bg-surface-container-highest rounded-t-sm h-[20%]" />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[8px] font-headline font-bold text-on-surface-variant">MATCH 22</span>
              <span className="text-[8px] font-headline font-bold text-secondary">MATCH 26 (ACTIVE)</span>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
