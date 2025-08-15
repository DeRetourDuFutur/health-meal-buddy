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
  signupSuccess() {
    toast({ description: "Inscription réussie." });
  },
  signupError(message?: string) {
    toast({ description: message || "Inscription impossible." });
  },
  resetEmailSent() {
    toast({ description: "Email de réinitialisation envoyé." });
  },
  passwordUpdated() {
    toast({ description: "Mot de passe mis à jour." });
  },
  resetError(message?: string) {
    toast({ description: message || "Réinitialisation impossible." });
  },
};
