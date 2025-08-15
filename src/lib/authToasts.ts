import { toast } from "@/components/ui/use-toast";

export const authToasts = {
  loginSuccess() {
    toast({ description: "Connexion réussie." });
  },
  loginError() {
    toast({ description: "Email ou mot de passe incorrect." });
  },
  logout() {
    toast({ description: "Déconnecté." });
  },
};
