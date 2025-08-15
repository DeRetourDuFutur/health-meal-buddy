import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authToasts } from "@/lib/authToasts";
import { supabase } from "@/lib/supabaseClient";

const emailSchema = z.object({ email: z.string().email("Email invalide") });
type EmailValues = z.infer<typeof emailSchema>;

const passSchema = z
  .object({ password: z.string().min(6, "Mot de passe trop court (min. 6)"), confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });
type PassValues = z.infer<typeof passSchema>;

const Reset = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState(false);
  const emailForm = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  const passForm = useForm<PassValues>({ resolver: zodResolver(passSchema), defaultValues: { password: "", confirmPassword: "" } });
  const [submitting, setSubmitting] = useState(false);

  // Soft-redirect si déjà connecté
  useEffect(() => {
    if (user) navigate("/planification", { replace: true });
  }, [user, navigate]);

  // Détecter l'état de recovery transmis par Supabase
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    // Heuristique: si l'URL contient des tokens Supabase, activer recovery
    if (/#access_token=|[?&]access_token=/.test(window.location.href)) setIsRecovery(true);
    return () => data.subscription.unsubscribe();
  }, []);

  const submitEmail = async (values: EmailValues) => {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: window.location.origin + "/reset",
    });
    setSubmitting(false);
    if (error) return authToasts.resetError(error.message);
    authToasts.resetEmailSent();
    navigate("/login", { replace: true });
  };

  const submitNewPassword = async (values: PassValues) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) return authToasts.resetError(error.message);
    authToasts.passwordUpdated();
    navigate("/login", { replace: true });
  };

  return (
    <AppLayout>
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Réinitialiser le mot de passe</h1>
          <Card>
            <CardHeader>
              <CardTitle>{isRecovery ? "Définir un nouveau mot de passe" : "Réinitialiser le mot de passe"}</CardTitle>
            </CardHeader>
            <CardContent>
              {isRecovery ? (
                <Form {...passForm}>
                  <form onSubmit={passForm.handleSubmit(submitNewPassword)} className="space-y-4">
                    <FormField
                      control={passForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau mot de passe</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(submitEmail)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="vous@exemple.com" autoComplete="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? "Envoi..." : "Envoyer le lien de réinitialisation"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reset;
