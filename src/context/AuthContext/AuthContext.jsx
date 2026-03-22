import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { loginRequest } from "../../api/auth.js";
import api from "../../api/axiosInstance.js";
import { AuthContext } from "../Contexts.jsx";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Leer token/usuario al montar la app
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setIsAuthenticated(true);

        // If the stored session is missing username (old session before fix),
        // re-fetch the full profile from the API before unblocking the app.
        if (!parsed.username && parsed.id) {
          api.get(`/api/users/${parsed.id}`)
            .then((r) => {
              const enriched = {
                ...parsed,
                username: r.data.username ?? parsed.username,
                email:    r.data.email    ?? parsed.email,
              };
              localStorage.setItem("user", JSON.stringify(enriched));
              setUser(enriched);
            })
            .catch(() => setUser(parsed))
            .finally(() => setIsInitializing(false));
          return; // setIsInitializing(false) will be called by .finally()
        }

        setUser(parsed);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsInitializing(false);
  }, []);

  const login = async (userReq) => {
    try {
      const res = await loginRequest(userReq);
      if (!res.data.token) throw new Error("Invalid credentials");

      const decoded = jwtDecode(res.data.token);
      // Prefer the user object the API returns directly; fall back to JWT claims
      const apiUser = res.data.user ?? {};
      const user = {
        id:       apiUser.id       ?? decoded.sub ?? decoded.id,
        email:    apiUser.email    ?? decoded.email,
        username: apiUser.username ?? decoded.username ?? decoded.name ?? decoded.preferred_username,
        role:     apiUser.role     ?? decoded.role,
      };

      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/");
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      throw new Error(backendMessage || error.message || "Login failed");
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        user,
        isAuthenticated,
        isInitializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
