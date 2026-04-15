import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { ProfileKinetic } from "./pages/ProfileKinetic";
import { Signup } from "./pages/Signup";
import { SquadBuilder } from "./pages/SquadBuilder";
import { TransferMarket } from "./pages/TransferMarket";
import { PackOpening } from "./pages/PackOpening";
import { LiveMatch } from "./pages/LiveMatch";
import { LiveStrategyConsole } from "./pages/LiveStrategyConsole";
import { ClubWizardKinetic } from "./pages/ClubWizardKinetic";
import { HookPacks } from "./pages/HookPacks";
import { Leaderboard } from "./pages/Leaderboard";
import { PlayerUpgrades } from "./pages/PlayerUpgrades";
import { Missions } from "./pages/Missions";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<RequireAuth />}>
          <Route index element={<Dashboard />} />
          <Route path="/club/create" element={<ClubWizardKinetic />} />
          <Route path="/hook/packs" element={<HookPacks />} />
          <Route path="/profile" element={<ProfileKinetic />} />
          <Route path="/squad" element={<SquadBuilder />} />
          <Route path="/market" element={<TransferMarket />} />
          <Route path="/packs" element={<PackOpening />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/upgrade" element={<PlayerUpgrades />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/live" element={<LiveStrategyConsole />} />
          <Route path="/live-simple" element={<LiveMatch />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
