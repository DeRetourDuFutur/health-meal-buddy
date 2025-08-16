import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import PathNormalizer from "./PathNormalizer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Profil from "./pages/Profil";
import Planification from "./pages/Planification";
import Aliments from "./pages/Aliments";
import Recettes from "./pages/Recettes";
import Courses from "./pages/Courses";
import Suivi from "./pages/Suivi";
import Medicaments from "./pages/Medicaments";
import Statistiques from "./pages/Statistiques";
import Parametres from "./pages/Parametres";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Reset from "./pages/Reset";
import RequireAuth from "@/components/auth/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <PathNormalizer />
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
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
