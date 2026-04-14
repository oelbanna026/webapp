import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import { useClub } from "../../club/useClub";

const BG = "https://lh3.googleusercontent.com/aida-public/AB6AXuB9HhLLeohn-8cv1V9XQsNpgxpJ2hmFfsUsyoUk3ngmtyhGogQd8ngdeT8ade2G38gAX2mFzlvAggI16TyrCtE4ViA1vz3QrkmXrNvjCiiVa0yKzZc6-c4H8T4nPxK95LdRm-MR143JTJNTzcmFDgk1XnX68iwEkiTGqpoyl1RDPNPK-HxYS5mEvF1HAiDcamoo8NfQaLG3S0jtKlcpbnzYTdw0XL5JtUDGeywd6p9IOLtKpczYM8mobkBneFroJARAD43uM8Q6LVE";

const THEME_OVERLAY = {
  night: "from-surface via-surface/90 to-transparent",
  neon: "from-surface via-primary/10 to-transparent",
  classic: "from-surface via-surface-container-low/90 to-transparent",
};

const THEME_SCANLINE = {
  night: "opacity-20",
  neon: "opacity-25",
  classic: "opacity-10",
};

export function AppShell({ children }) {
  const { club } = useClub();
  const theme = club?.theme || "night";
  const overlay = THEME_OVERLAY[theme] || THEME_OVERLAY.night;
  const scanline = THEME_SCANLINE[theme] || THEME_SCANLINE.night;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      <TopBar />
      <SideNav />
      <main className="pl-64 pt-16 min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
          <img alt="background stadium" className="w-full h-full object-cover" src={BG} />
          <div className={`absolute inset-0 bg-gradient-to-tr ${overlay}`} />
          <div className={`absolute inset-0 hud-scanline ${scanline}`} />
        </div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
