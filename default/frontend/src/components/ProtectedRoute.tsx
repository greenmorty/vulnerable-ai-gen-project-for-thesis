/**
 * Responsibility: Protects authenticated and role-restricted route branches in the React Router tree.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
}

export const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <div className="status-banner">Checking your ShopSphere session...</div>;
  }

  if (!user) {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
};
