import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authToasts } from "@/lib/authToasts";

const schema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Mot de passe trop court (min. 6)").max(72, "Mot de passe trop long"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas.",
  });

type FormValues = z.infer<typeof schema>;

const Register = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const emailKey = useMemo(() => "nutri:lastEmail", []);

  // Focus email et préremplissage depuis localStorage
  useEffect(() => {
    const last = localStorage.getItem(emailKey);
    if (last) form.setValue("email", last);
  document.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
  }, [emailKey]);

  // Redirection douce si déjà connecté
  useEffect(() => {
    if (user) navigate("/planification", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    if (remember) localStorage.setItem(emailKey, values.email);
    else localStorage.removeItem(emailKey);

    const { error } = await signUp(values.email, values.password);
    setSubmitting(false);
    if (error) {
      const msg = /already|exists|registered/i.test(error)
        ? "Email déjà utilisé."
        : "Inscription impossible.";
      form.setError("email", { message: msg });
      authToasts.signupError(msg);
      return;
    }
    // Email confirmation désactivée: l'utilisateur est connecté immédiatement
    authToasts.signupSuccess();
    navigate("/planification", { replace: true });
  };

  return (
    <AppLayout>
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Inscription</h1>
          <Card>
            <CardHeader>
              <CardTitle>Créer un compte</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
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
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
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

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Se souvenir de moi
                    </label>
                    <Button type="submit" className="min-w-36" disabled={submitting}>
                      {submitting ? "Inscription..." : "S'inscrire"}
                    </Button>
                  </div>
                </form>
              </Form>
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Déjà un compte ? <Link to="/login" className="underline">Se connecter</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Register;
