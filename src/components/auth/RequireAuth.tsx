import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] w-full flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const pathname = location.pathname + (location.search || "") + (location.hash || "");
    const search = new URLSearchParams({ returnTo: pathname }).toString();
    return <Navigate to={`/login?${search}`} replace />;
  }

  return <>{children}</>;
}
