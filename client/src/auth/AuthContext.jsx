import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, authHeaders } from "../lib/api";
import { AuthContext } from "./authContext";

function getStoredToken() {
  try {
    return localStorage.getItem("token") || null;
  } catch {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  } catch {
    return;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    const data = await apiRequest("/api/users/me", { headers: authHeaders(token) });
    setUser(data.user);
    return data.user;
  }, [token]);

  const login = useCallback(async ({ email, password }) => {
    const data = await apiRequest("/api/auth/login", { method: "POST", json: { email, password } });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async ({ username, email, password }) => {
    const data = await apiRequest("/api/auth/signup", { method: "POST", json: { username, email, password } });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (token) await refreshMe();
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshMe, logout]);

  const value = useMemo(
    () => ({ token, user, isBootstrapping, login, signup, logout, refreshMe }),
    [token, user, isBootstrapping, login, signup, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
