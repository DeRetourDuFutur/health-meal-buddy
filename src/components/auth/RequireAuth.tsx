import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

// Garde de route (non activée pour l’instant):
// Actuellement, retourne toujours children pour laisser tout accessible.
// Pour l’activer plus tard: si pas d'user, rediriger vers /login.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const _auth = useAuth();
  return <>{children}</>;
}
