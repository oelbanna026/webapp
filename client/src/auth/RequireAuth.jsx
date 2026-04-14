import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useClub } from "../club/useClub";

export function RequireAuth() {
  const { token, isBootstrapping, user } = useAuth();
  const { club, isLoadingClub } = useClub();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-background text-on-surface grid place-items-center">
        <div className="glass-card rounded-xl p-6">Connecting…</div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (isLoadingClub) {
    return (
      <div className="min-h-screen bg-background text-on-surface grid place-items-center">
        <div className="glass-card rounded-xl p-6">Loading club…</div>
      </div>
    );
  }
  if (!club && location.pathname !== "/club/create") return <Navigate to="/club/create" replace />;
  if ((user?.starterPacks ?? 0) > 0 && location.pathname !== "/hook/packs" && location.pathname !== "/club/create") {
    return <Navigate to="/hook/packs" replace />;
  }
  return <Outlet />;
}
