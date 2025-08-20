import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import PathNormalizer from "./PathNormalizer";
import { prefetchCriticalRoutes } from "./prefetchRoutes";
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Profil = React.lazy(() => import("./pages/Profil"));
const Planification = React.lazy(() => import("./pages/Planification"));
const Aliments = React.lazy(() => import("./pages/Aliments"));
const Recettes = React.lazy(() => import("./pages/Recettes"));
const Courses = React.lazy(() => import("./pages/Courses"));
const Suivi = React.lazy(() => import("./pages/Suivi"));
const Medicaments = React.lazy(() => import("./pages/Medicaments"));
const Statistiques = React.lazy(() => import("./pages/Statistiques"));
const Parametres = React.lazy(() => import("./pages/Parametres"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Reset = React.lazy(() => import("./pages/Reset"));
import RequireAuth from "@/components/auth/RequireAuth";

const queryClient = new QueryClient();

function Prefetcher() {
  React.useEffect(() => {
    prefetchCriticalRoutes();
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <PathNormalizer />
            <Prefetcher />
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profil" element={<RequireAuth><Profil /></RequireAuth>} />
                <Route path="/planification" element={<RequireAuth><Planification /></RequireAuth>} />
                <Route path="/aliments" element={<RequireAuth><Aliments /></RequireAuth>} />
                <Route path="/recettes" element={<RequireAuth><Recettes /></RequireAuth>} />
                <Route path="/courses" element={<RequireAuth><Courses /></RequireAuth>} />
                <Route path="/suivi" element={<RequireAuth><Suivi /></RequireAuth>} />
                <Route path="/medicaments" element={<RequireAuth><Medicaments /></RequireAuth>} />
                <Route path="/statistiques" element={<RequireAuth><Statistiques /></RequireAuth>} />
                <Route path="/parametres" element={<RequireAuth><Parametres /></RequireAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset" element={<Reset />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
