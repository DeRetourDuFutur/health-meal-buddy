import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { authToasts } from "@/lib/authToasts";

const Profil = () => {
  const { user } = useAuth();
  const schema = z.object({ display_name: z.string().trim().min(2, "Trop court").max(64, "Trop long") });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: (user?.user_metadata as any)?.display_name || "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    const { error } = await supabase.auth.updateUser({ data: { display_name: values.display_name } });
    if (error) return authToasts.genericError(error.message);
    authToasts.profileUpdated();
  }
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Mon Profil</h1>
        <div className="grid gap-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Compte</CardTitle>
              <CardDescription>Informations de base liées à votre compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ID utilisateur</span>
                <span className="font-mono text-xs">{user?.id ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleString() : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profil public</CardTitle>
              <CardDescription>Nom d’affichage et préférences.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom d’affichage</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Marie Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Enregistrer</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profil;
