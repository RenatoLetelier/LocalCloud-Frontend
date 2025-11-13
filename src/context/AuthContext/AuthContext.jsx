import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../../api/auth.js";
import { AuthContext } from "../Contexts.jsx";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Leer token/usuario al montar la app
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (userReq) => {
    try {
      const res = await loginRequest(userReq);

      if (!res.data.token) throw new Error("Invalid credentials");
      if (!res.data.user?.id || !res.data.user?.email)
        throw new Error("Invalid user data");

      setUser(res.data.user);
      setIsAuthenticated(true);

      localStorage.setItem("token", JSON.stringify(res.data.token));
      localStorage.setItem("user", JSON.stringify(res.data.user));

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
