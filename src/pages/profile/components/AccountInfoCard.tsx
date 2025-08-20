import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type AccountInfoCardProps = {
  email?: string | null;
  userId?: string | null;
  createdAt?: string | null;
};

export function AccountInfoCard({ email, userId, createdAt }: AccountInfoCardProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Compte</CardTitle>
        <CardDescription>Informations de base liées à votre compte.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Email/Login</span>
          <span className="font-medium">{email ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">ID utilisateur</span>
          <span className="font-mono text-xs">{userId ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Créé le</span>
          <span className="font-medium">{createdAt ? new Date(createdAt).toLocaleString() : "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
