import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  useMyProfile,
  useUpsertMyProfile,
  usePathologies,
  useMyPathologies,
  useMyProfileHistory,
  useUpdateAvatar,
  getAvatarUrlOrNull,
  checkLoginAvailable,
} from "@/hooks/useProfile";
import type { ProfileInput } from "@/lib/db/profiles";
import { profileInputSchema } from "@/lib/db/profiles";

const Profil = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Queries & mutations
  const profileQ = useMyProfile();
  const upsert = useUpsertMyProfile();
  const pathologiesQ = usePathologies();
  const myPathos = useMyPathologies();
  useMyProfileHistory(10); // prime cache (affichage optionnel)
  const uploadAvatar = useUpdateAvatar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form init
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      login: "",
      full_name: "",
      birthdate: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      is_private: undefined,
      avatar_url: undefined,
    },
  });

  // Populate on load
  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    form.reset({
      login: p.login ?? "",
      full_name: p.full_name ?? "",
      birthdate: p.birthdate ?? undefined,
      height_cm: p.height_cm ?? undefined,
      weight_kg: p.weight_kg ?? undefined,
      is_private: p.is_private ?? undefined,
      avatar_url: p.avatar_url ?? undefined,
    });
  }, [profileQ.data]);

  // Avatar display (signed URL)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0); // permet de forcer un refresh signé
  useEffect(() => {
    (async () => {
      const url = await getAvatarUrlOrNull(profileQ.data?.avatar_url ?? null);
      setAvatarUrl(url);
    })();
  }, [profileQ.data?.avatar_url, avatarVersion]);

  // Login availability check
  const [loginStatus, setLoginStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const checkLogin = async (value: string) => {
    if (!value || value.trim().length < 3) {
      setLoginStatus("idle");
      return;
    }
    setLoginStatus("checking");
    try {
      const ok = await checkLoginAvailable(value.trim());
      setLoginStatus(ok ? "ok" : "taken");
    } catch {
      setLoginStatus("idle");
    }
  };

  // Confirmation dialog before save
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initial = profileQ.data;
  const changes = useMemo(() => {
    const v = form.getValues();
    const diff: Partial<ProfileInput> = {};
    if (!initial) return diff;
    if ((v.login ?? "") !== (initial.login ?? "")) diff.login = v.login;
    if ((v.full_name ?? "") !== (initial.full_name ?? "")) diff.full_name = v.full_name;
    if ((v.birthdate ?? undefined) !== (initial.birthdate ?? undefined)) diff.birthdate = v.birthdate;
    if ((v.height_cm ?? undefined) !== (initial.height_cm ?? undefined)) diff.height_cm = v.height_cm;
    if ((v.weight_kg ?? undefined) !== (initial.weight_kg ?? undefined)) diff.weight_kg = v.weight_kg;
    if ((v.is_private ?? undefined) !== (initial.is_private ?? undefined)) diff.is_private = v.is_private;
    return diff;
  }, [form.watch(), initial]);

  const hasChanges = Object.keys(changes).length > 0;

  const onSubmit = async () => {
    if (!hasChanges) {
      toast({ title: "Aucune modification", description: "Rien à enregistrer." });
      return;
    }
    setConfirmOpen(true);
  };

  const doSave = async () => {
    try {
      await upsert.mutateAsync(changes);
      toast({ title: "Enregistré", description: "Profil mis à jour." });
      setConfirmOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible d'enregistrer.", variant: "destructive" });
    }
  };
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
        {profileQ.isError ? (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            Erreur chargement profil: {String((profileQ.error as any)?.message ?? profileQ.error)}
          </div>
        ) : null}
        <div className="grid gap-6 max-w-5xl">
          {/* Compte */}
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

          {/* Avatar */}
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>Image de profil stockée de façon privée.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
                <AvatarFallback>{(profileQ.data?.full_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-x-2">
        <input ref={(el) => (fileInputRef.current = el)} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const inputEl = e.currentTarget;
                  const f = inputEl.files?.[0];
                  if (!f) return;
                  try {
                    const path = await uploadAvatar.mutateAsync(f);
                    toast({ title: "Avatar mis à jour" });
                    // On génère immédiatement une URL signée pour ce path (persiste après 1s)
                    const signed = await getAvatarUrlOrNull(path);
                    if (signed) setAvatarUrl(signed);
                    // Ensuite, on forcera un refresh mineur au cas où la DB se met à jour différemment
                    setTimeout(() => setAvatarVersion((v) => v + 1), 1500);
                  } catch (err: any) {
                    toast({ title: "Erreur", description: err?.message ?? "Upload impossible", variant: "destructive" });
                  } finally {
                    if (inputEl) inputEl.value = ""; // reset sans accéder à un event relâché
                  }
                }} />
                <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatar.isPending}>
                  {uploadAvatar.isPending ? "Envoi…" : "Téléverser"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire profil */}
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Identifiant, infos personnelles et confidentialité.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="grid md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                  {/* login */}
                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Identifiant (login)</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input placeholder="ex: marie42" value={field.value ?? ""} onChange={field.onChange} onBlur={(e) => { field.onBlur(); checkLogin(e.target.value); }} />
                          </FormControl>
                          <span className="text-xs text-muted-foreground min-w-[80px]">
                            {loginStatus === "idle" && ""}
                            {loginStatus === "checking" && "Vérif…"}
                            {loginStatus === "ok" && <span className="text-emerald-600">disponible</span>}
                            {loginStatus === "taken" && <span className="text-red-600">déjà pris</span>}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* full_name */}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Marie Dupont" value={field.value ?? ""} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* birthdate */}
                  <FormField
                    control={form.control}
                    name="birthdate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <FormControl>
                          <Input type="date" value={field.value ?? ""} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* height */}
                  <FormField
                    control={form.control}
                    name="height_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taille (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="decimal" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* weight */}
                  <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poids (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="decimal" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* BMI readonly */}
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground">
                      IMC (calculé): <span className="font-medium">{profileQ.data?.bmi ?? "—"}</span>
                    </div>
                  </div>

                  {/* privacy */}
                  <FormField
                    control={form.control}
                    name="is_private"
                    render={({ field }) => (
                      <FormItem className="col-span-full flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel>Profil privé</FormLabel>
                          <div className="text-sm text-muted-foreground">Masque certaines informations pour les autres.</div>
                        </div>
                        <FormControl>
                          <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(v)} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-full flex gap-2">
                    <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
                    {hasChanges ? <span className="text-xs text-muted-foreground self-center">Des modifications seront enregistrées après confirmation.</span> : null}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Pathologies */}
          <Card>
            <CardHeader>
              <CardTitle>Pathologies</CardTitle>
              <CardDescription>Sélection multiple. Vous pouvez cocher/décocher pour ajouter/retirer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(myPathos.list.data ?? []).map((up) => (
                  <Badge key={up.id} variant="secondary">{up.pathology?.label ?? up.pathology_id}</Badge>
                ))}
              </div>
              <div className="grid gap-2 max-h-64 overflow-auto border rounded-md p-3">
                {(pathologiesQ.data ?? []).map((p) => {
                  const selected = (myPathos.list.data ?? []).some((up) => up.pathology_id === p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-3">
                      <Checkbox checked={selected} onCheckedChange={async (v) => {
                        try {
                          if (v) await myPathos.add.mutateAsync(p.id);
                          else await myPathos.remove.mutateAsync(p.id);
                        } catch (e: any) {
                          toast({ title: "Erreur", description: e?.message ?? "Action impossible", variant: "destructive" });
                        }
                      }} />
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">({p.code})</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confirmation dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer les modifications</DialogTitle>
              <DialogDescription>Un récapitulatif des champs modifiés est affiché ci-dessous.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {Object.keys(changes).length === 0 ? (
                <div>Aucune modification détectée.</div>
              ) : (
                <ul className="list-disc pl-5">
                  {Object.entries(changes).map(([k, v]) => (
                    <li key={k}><span className="font-medium">{k}</span>: {String(v)}</li>
                  ))}
                </ul>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Annuler</Button>
              <Button onClick={doSave} disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Confirmer"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Profil;
