import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <PathNormalizer />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/planification" element={<Planification />} />
          <Route path="/aliments" element={<Aliments />} />
          <Route path="/recettes" element={<Recettes />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/suivi" element={<Suivi />} />
          <Route path="/medicaments" element={<Medicaments />} />
          <Route path="/statistiques" element={<Statistiques />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset" element={<Reset />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
