import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function StaffRoute({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (role !== "staff" && role !== "admin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
