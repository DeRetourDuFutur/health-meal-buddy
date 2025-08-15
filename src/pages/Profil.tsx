import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Profil = () => {
  const { user } = useAuth();
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
              <CardDescription>Avatar, nom d’affichage et préférences (à venir).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Placeholders à implémenter dans une future étape.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profil;
