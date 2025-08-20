import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrlOrNull, useDeleteAvatar, useUpdateAvatar } from "@/hooks/useProfile";

export function useAvatarManager(initialPath: string | null | undefined) {
  const { toast } = useToast();
  const uploadAvatar = useUpdateAvatar();
  const delAvatar = useDeleteAvatar();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    (async () => {
      const url = await getAvatarUrlOrNull(initialPath ?? null);
      setAvatarUrl(url);
    })();
  }, [initialPath, avatarVersion]);

  async function onPickFileClick() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;
    const f = inputEl.files?.[0];
    if (!f) return;
    try {
      const path = await uploadAvatar.mutateAsync(f);
      toast({ title: "Avatar mis à jour" });
      const signed = await getAvatarUrlOrNull(path);
      if (signed) setAvatarUrl(signed);
      setTimeout(() => setAvatarVersion((v) => v + 1), 1500);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Upload impossible";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      if (inputEl) inputEl.value = "";
    }
  }

  async function onDelete(currentPath?: string | null) {
    const ok = window.confirm("Supprimer l'avatar ?");
    if (!ok) return;
    try {
      await delAvatar.mutateAsync(currentPath ?? undefined);
      setAvatarUrl("/placeholder.svg");
      toast({ title: "Avatar supprimé" });
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Suppression impossible";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setTimeout(() => setAvatarVersion((v) => v + 1), 500);
    }
  }

  return {
    refs: { fileInputRef },
    state: { avatarUrl, avatarVersion },
    actions: { onPickFileClick, onFileChange, onDelete },
    mutations: { uploadAvatar, delAvatar },
  } as const;
}
