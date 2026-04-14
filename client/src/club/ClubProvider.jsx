import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubContext } from "./clubContext";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";

export function ClubProvider({ children }) {
  const { token } = useAuth();
  const [club, setClub] = useState(null);
  const [isLoadingClub, setIsLoadingClub] = useState(true);

  const refreshClub = useCallback(async () => {
    if (!token) {
      setClub(null);
      setIsLoadingClub(false);
      return null;
    }
    const data = await apiRequest("/api/clubs/me", { headers: authHeaders(token) });
    setClub(data.club);
    return data.club;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingClub(true);
      try {
        await refreshClub();
      } finally {
        if (!cancelled) setIsLoadingClub(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshClub]);

  const value = useMemo(() => ({ club, isLoadingClub, refreshClub, setClub }), [club, isLoadingClub, refreshClub]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

