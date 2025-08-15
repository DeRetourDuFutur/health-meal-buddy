import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Supprime les slashs finaux (sauf la racine "/") pour éviter des 404 type "/route/".
export default function PathNormalizer() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const normalized = pathname.replace(/\/+$/, "");
      navigate(normalized + search + hash, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

  return null;
}
