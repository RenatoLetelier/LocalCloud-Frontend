import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/Contexts.jsx";

export default function ProtectedLayout() {
  const { isAuthenticated, isInitializing } = useContext(AuthContext);
  const location = useLocation();

  if (isInitializing) return (
    <div className="app-spinner-wrap">
      <div className="app-spinner" />
    </div>
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
