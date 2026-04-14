import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useClub } from "../../club/useClub";
import { Icon } from "../Icon";

export function TopBar() {
  const { user, logout } = useAuth();
  const { club } = useClub();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0a0e14]/80 backdrop-blur-xl border-b border-[#44484f]/15 shadow-[0_20px_40px_rgba(0,227,253,0.08)] flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-2xl font-black tracking-tighter text-[#00E5FF] font-headline uppercase">
            STADIUM_OS
          </Link>
          {club?.name ? (
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 bg-surface-container-highest/40 rounded-lg border border-outline-variant/10">
              <Icon name="shield" className="text-primary text-sm" />
              <div className="leading-tight">
                <div className="font-headline font-bold text-xs tracking-tight">{club.name}</div>
                {club?.stadium?.name ? <div className="text-[10px] text-on-surface-variant">{club.stadium.name}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
            <Icon name="monetization_on" className="text-secondary text-sm" />
            <span className="font-headline font-bold text-sm tracking-tight">{user?.coins?.toLocaleString?.() ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
            <Icon name="bolt" className="text-primary text-sm" filled />
            <span className="font-headline font-bold text-sm tracking-tight text-primary">{user?.energy ?? 0}/10</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
            <Icon name="database" className="text-primary text-sm" />
            <span className="font-headline font-bold text-sm tracking-tight text-primary">{user?.xp?.toLocaleString?.() ?? "0"}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
            <Icon name="emoji_events" className="text-secondary text-sm" />
            <span className="font-headline font-bold text-sm tracking-tight text-secondary">{user?.rankRating?.toLocaleString?.() ?? "1000"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-[#f1f3fc]/60 hover:text-[#00E5FF] hover:bg-[#20262f]/50 transition-all active:scale-95 duration-200">
          <Icon name="notifications" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-primary tracking-widest uppercase">Elite Manager</p>
            <p className="text-sm font-bold font-headline">{user?.username || "—"}</p>
          </div>
          <Link to="/profile">
            <div className="w-10 h-10 rounded-lg border-2 border-primary/30 bg-surface-container-highest grid place-items-center">
              <Icon name="person" className="text-primary" filled />
            </div>
          </Link>
        </div>
        <button
          onClick={logout}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/20 text-[#f1f3fc]/70 hover:text-primary hover:border-primary/40 transition-all font-headline text-[10px] font-bold uppercase tracking-widest"
        >
          <Icon name="logout" className="text-sm" />
          Logout
        </button>
      </div>
    </header>
  );
}
