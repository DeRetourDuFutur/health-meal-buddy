import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { authToasts } from "@/lib/authToasts";
import ThemeSelector from "@/components/settings/ThemeSelector";

const Parametres = () => {
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
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Paramètres</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Gérez votre nom d’affichage.</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Choisissez le thème de l’application.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Parametres;
