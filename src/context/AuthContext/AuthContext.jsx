import { useState } from "react";
import { loginRequest } from "../../api/auth.js";
import { AuthContext } from "../Contexts.jsx";
import { useNavigate } from "react-router-dom";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  const login = async (userReq) => {
    try {
      const res = await loginRequest(userReq);

      if (!res.ok || !res.data.token) {
        throw new Error("Invalid credentials");
      }
      if (!res.data.user?.id || !res.data.user?.email) {
        throw new Error("Invalid user data");
      }

      setUser(res.data.user);
      window.localStorage.setItem("token", JSON.stringify(res.data.token));
      navigate("/");
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      throw new Error(backendMessage || error.message || "Login failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
