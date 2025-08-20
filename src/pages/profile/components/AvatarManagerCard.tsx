import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Trash2 } from "lucide-react";
import { useAvatarManager } from "../hooks/useAvatarManager";

export type AvatarManagerCardProps = {
  initialAvatarPath: string | null | undefined;
  userRoleIsAdmin?: boolean;
  initials?: string;
};

export function AvatarManagerCard({ initialAvatarPath, userRoleIsAdmin, initials }: AvatarManagerCardProps) {
  const { refs, state, actions, mutations } = useAvatarManager(initialAvatarPath);
  const { fileInputRef } = refs;
  const { avatarUrl } = state;
  const { onPickFileClick, onFileChange, onDelete } = actions;

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>Image de profil stockée de façon privée.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <HoverCard>
          <HoverCardTrigger asChild>
            <Avatar className="h-16 w-16 cursor-zoom-in">
              <AvatarImage src={avatarUrl ?? "/placeholder.svg"} alt="Avatar" />
              <AvatarFallback className={userRoleIsAdmin ? "bg-emerald-900 text-white" : undefined}>
                {(initials ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-auto p-2">
            <Avatar className="h-40 w-40">
              <AvatarImage src={avatarUrl ?? "/placeholder.svg"} alt="Avatar agrandi" />
              <AvatarFallback className={userRoleIsAdmin ? "bg-emerald-900 text-white" : undefined}>
                {(initials ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </HoverCardContent>
        </HoverCard>
        <div className="space-x-2">
          <input ref={(el) => (fileInputRef.current = el)} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <Button type="button" onClick={onPickFileClick} disabled={mutations.uploadAvatar.isPending} title="Charger un avatar" className="h-9 w-9 p-0 rounded-full justify-center">
            <Upload className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Charger</span>
          </Button>
          <Button type="button" variant="destructive" disabled={mutations.delAvatar.isPending} onClick={() => onDelete(initialAvatarPath)}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Supprimer</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
