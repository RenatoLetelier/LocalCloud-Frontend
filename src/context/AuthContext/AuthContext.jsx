import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { loginRequest } from "../../api/auth.js";
import api from "../../api/axiosInstance.js";
import { AuthContext } from "../Contexts.jsx";

// ── Session storage keys ──────────────────────────────────────────────────────
// sessionStorage is used intentionally: it is cleared automatically when the
// browser tab (or window) is closed, so credentials never persist across sessions.
const TOKEN_KEY = "token";
const USER_KEY  = "user";

function isTokenExpired(token) {
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 <= Date.now();
  } catch {
    return true; // unparseable token → treat as expired
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing,  setIsInitializing]  = useState(true);

  const navigate      = useNavigate();
  const navigateRef   = useRef(navigate);           // always-fresh ref so timeouts can navigate
  const refreshTimer  = useRef(null);

  useEffect(() => { navigateRef.current = navigate; });

  // ── Refresh-timer helpers ─────────────────────────────────────────────────

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  /**
   * Schedule a silent token refresh ~5 minutes before the JWT expires.
   * On success: stores the new token and reschedules.
   * On failure: clears the session and redirects to /login.
   */
  const scheduleRefresh = useCallback((token) => {
    clearRefreshTimer();
    try {
      const { exp } = jwtDecode(token);
      const msUntilExpiry = exp * 1000 - Date.now();
      if (msUntilExpiry <= 0) return; // already expired — nothing to schedule

      // Fire 5 min before expiry (or immediately if < 5 min remaining)
      const delay = Math.max(0, msUntilExpiry - 5 * 60 * 1000);

      refreshTimer.current = setTimeout(async () => {
        const current = sessionStorage.getItem(TOKEN_KEY);
        if (!current) return;
        try {
          const res = await axios.post(
            "/api/auth/refresh",
            { token: current },
            { headers: { "Content-Type": "application/json" } }
          );
          const newToken = res.data.token;
          sessionStorage.setItem(TOKEN_KEY, newToken);
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          scheduleRefresh(newToken); // schedule next refresh
        } catch {
          // Refresh failed — force logout without calling logout() to avoid circular deps
          clearRefreshTimer();
          setUser(null);
          setIsAuthenticated(false);
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(USER_KEY);
          navigateRef.current("/login");
        }
      }, delay);
    } catch {
      /* jwtDecode failed — token is unusable, do nothing */
    }
  }, [clearRefreshTimer]);

  // Clear timer on unmount
  useEffect(() => () => clearRefreshTimer(), [clearRefreshTimer]);

  // ── Initialization: restore session from sessionStorage ───────────────────

  useEffect(() => {
    const token      = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!token || !storedUser) {
      setIsInitializing(false);
      return;
    }

    // Reject already-expired tokens right away — don't show the app
    if (isTokenExpired(token)) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setIsInitializing(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setIsAuthenticated(true);

      // If the stored session is missing username (old session before fix),
      // silently re-fetch the full profile before unblocking the app.
      if (!parsed.username && parsed.id) {
        api.get(`/api/users/${parsed.id}`)
          .then((r) => {
            const enriched = {
              ...parsed,
              username: r.data.username ?? parsed.username,
              email:    r.data.email    ?? parsed.email,
            };
            sessionStorage.setItem(USER_KEY, JSON.stringify(enriched));
            setUser(enriched);
            scheduleRefresh(token);
          })
          .catch(() => { setUser(parsed); scheduleRefresh(token); })
          .finally(() => setIsInitializing(false));
        return; // setIsInitializing(false) called by .finally()
      }

      setUser(parsed);
      scheduleRefresh(token);
    } catch {
      // Corrupted stored data — clear everything
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }

    setIsInitializing(false);
  }, [scheduleRefresh]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (userReq) => {
    try {
      const res = await loginRequest(userReq);
      if (!res.data.token) throw new Error("Invalid credentials");

      const decoded = jwtDecode(res.data.token);
      const apiUser = res.data.user ?? {};
      const userData = {
        id:       apiUser.id       ?? decoded.sub  ?? decoded.id,
        email:    apiUser.email    ?? decoded.email,
        username: apiUser.username ?? decoded.username ?? decoded.name ?? decoded.preferred_username,
        role:     apiUser.role     ?? decoded.role,
      };

      setUser(userData);
      setIsAuthenticated(true);
      sessionStorage.setItem(TOKEN_KEY, res.data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
      scheduleRefresh(res.data.token);
      navigate("/");
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      throw new Error(backendMessage || error.message || "Login failed");
    }
  };

  const logout = useCallback(() => {
    clearRefreshTimer();
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    navigate("/login");
  }, [clearRefreshTimer, navigate]);

  return (
    <AuthContext.Provider
      value={{ login, logout, user, isAuthenticated, isInitializing }}
    >
      {children}
    </AuthContext.Provider>
  );
};
