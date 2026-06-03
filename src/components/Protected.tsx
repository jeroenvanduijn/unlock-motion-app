import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/database.types";
import type { ReactNode } from "react";

export function Protected({ role, children }: { role?: Role; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === "coach" ? "/coach" : "/app"} replace />;
  }
  return <>{children}</>;
}
