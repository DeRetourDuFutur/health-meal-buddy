import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

type FormValues = z.infer<typeof schema>;

const Login = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (error) {
      // Map any Supabase auth error to a generic French message
      const message = "Email ou mot de passe incorrect.";
      form.setError("password", { message });
      toast({ description: message });
      return;
    }
    toast({ description: "Connexion réussie." });
    navigate("/planification", { replace: true });
  };

  return (
    <AppLayout>
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Connexion</h1>
          <Card>
            <CardHeader>
              <CardTitle>Se connecter</CardTitle>
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
                          <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Pas de compte ? <Link to="/register" className="underline">Créer un compte</Link>
              </div>
              <div className="mt-2 text-sm text-muted-foreground text-center">
                <Link to="/reset" className="underline">Mot de passe oublié ?</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Login;
