import { NavLink } from "react-router-dom";
import { Icon } from "../Icon";

function NavItem({ to, icon, label }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          isActive
            ? "flex items-center gap-4 text-[#00E5FF] bg-[#20262f] border-r-4 border-[#00E5FF] px-6 py-4 transition-colors duration-300 font-headline text-xs font-bold uppercase tracking-widest"
            : "flex items-center gap-4 text-[#f1f3fc]/40 px-6 py-4 hover:bg-[#20262f]/80 hover:text-[#00E5FF] transition-colors duration-300 font-headline text-xs font-bold uppercase tracking-widest"
        }
      >
        <Icon name={icon} />
        {label}
      </NavLink>
    </li>
  );
}

export function SideNav() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-40 bg-[#0f141a] border-r border-[#44484f]/15 flex flex-col pt-20 pb-8">
      <div className="px-6 mb-8">
        <h2 className="text-lg font-black text-[#00E5FF] font-headline">COMMAND_CENTER</h2>
        <p className="text-[10px] text-[#f1f3fc]/40 font-headline font-bold uppercase tracking-widest">Elite Division</p>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          <NavItem to="/" icon="strategy" label="Tactics" />
          <NavItem to="/squad" icon="group" label="Squad" />
          <NavItem to="/upgrade" icon="upgrade" label="Upgrade" />
          <NavItem to="/market" icon="shopping_cart" label="Market" />
          <NavItem to="/missions" icon="task_alt" label="Missions" />
          <NavItem to="/leaderboard" icon="emoji_events" label="Leagues" />
          <NavItem to="/live" icon="fitness_center" label="Training" />
        </ul>
      </nav>
      <div className="px-6 mb-6">
        <NavLink
          to="/live"
          className="w-full bg-secondary text-on-secondary font-headline font-black py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
        >
          <Icon name="sensors" className="text-on-secondary" filled />
          GO_LIVE
        </NavLink>
      </div>
      <div className="border-t border-outline-variant/10 pt-4">
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive
                  ? "flex items-center gap-4 text-[#00E5FF] bg-[#20262f]/80 px-6 py-3 transition-colors duration-300 font-headline text-[10px] font-bold uppercase tracking-widest"
                  : "flex items-center gap-4 text-[#f1f3fc]/40 px-6 py-3 hover:bg-[#20262f]/80 hover:text-[#00E5FF] transition-colors duration-300 font-headline text-[10px] font-bold uppercase tracking-widest"
              }
            >
              <Icon name="settings" className="text-sm" />
              Profile
            </NavLink>
          </li>
        </ul>
      </div>
    </aside>
  );
}
