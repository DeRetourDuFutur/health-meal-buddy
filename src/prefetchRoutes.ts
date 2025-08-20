// Précharge à la demande quelques routes critiques pour fluidifier la navigation
// Sans modifier l’UI, en profitant de requestIdleCallback et des infos réseau.

function canPrefetch(): boolean {
  try {
    const nav = (navigator as any);
    if (nav?.connection?.saveData) return false;
    const type = nav?.connection?.effectiveType as string | undefined;
    if (type && /^(2g)$/i.test(type)) return false;
  } catch {}
  return true;
}

function onIdle(cb: () => void) {
  const ric: any = (window as any).requestIdleCallback;
  if (typeof ric === "function") {
    ric(() => cb());
  } else {
    setTimeout(cb, 400);
  }
}

function prefetchImport(fn: () => Promise<unknown>) {
  // Lancer le téléchargement, ignorer toute erreur
  try {
    void fn();
  } catch {}
}

export function prefetchCriticalRoutes() {
  if (!canPrefetch()) return;
  onIdle(() => {
    const imports: Array<() => Promise<unknown>> = [
      () => import(/* @vite-ignore */ "./pages/Index"),
      () => import(/* @vite-ignore */ "./pages/Login"),
      () => import(/* @vite-ignore */ "./pages/Profil"),
    ];

    // Espace légèrement pour ne pas saturer
    let delay = 0;
    for (const imp of imports) {
      setTimeout(() => prefetchImport(imp), delay);
      delay += 150;
    }
  });
}
