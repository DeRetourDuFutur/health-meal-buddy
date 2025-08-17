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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
  useDeleteAvatar,
  getAvatarUrlOrNull,
  checkLoginAvailable,
  useMyCustomPathologies,
  useAddMyCustomPathology,
  useToggleMyCustomPathologyHidden,
  usePromoteCustomPathologies,
  useDemoteDefaultPathologyToCustom,
  useAdminDeleteDefaultPathology,
  useAdminDeleteCustomPathology,
  computeBmi,
} from "@/hooks/useProfile";
import type { ProfileInput } from "@/lib/db/profiles";
import { profileInputSchema } from "@/lib/db/profiles";
import { Lock, Unlock, Trash2, Upload } from "lucide-react";

const Profil = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Queries & mutations
  const profileQ = useMyProfile();
  const upsert = useUpsertMyProfile();
  const pathologiesQ = usePathologies();
  const myPathos = useMyPathologies();
  const myCustom = useMyCustomPathologies();
  const addCustom = useAddMyCustomPathology();
  const toggleCustomHidden = useToggleMyCustomPathologyHidden();
  const promoteCustom = usePromoteCustomPathologies();
  const demoteDefault = useDemoteDefaultPathologyToCustom();
  const delDefault = useAdminDeleteDefaultPathology();
  const delCustom = useAdminDeleteCustomPathology();
  const [customCode, setCustomCode] = useState("");
  const sanitizeCode = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
  useMyProfileHistory(10); // prime cache (affichage optionnel)
  const uploadAvatar = useUpdateAvatar();
  const delAvatar = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  // Aides: sets pour détection des pathos "défaut" SÉLECTIONNÉS par l'utilisateur
  const selectedDefaultCodes = useMemo(() => new Set((myPathos.list.data ?? [])
    .map((up) => (up.pathology?.code || "").toUpperCase())
    .filter(Boolean)), [myPathos.list.data]);
  const selectedDefaultLabels = useMemo(() => new Set((myPathos.list.data ?? [])
    .map((up) => (up.pathology?.label || "").toLowerCase())
    .filter(Boolean)), [myPathos.list.data]);
  const showAdmin = user?.user_metadata?.role === "admin";
  // Masquage UI de la section "Confidentialité" (fonctionnalité conservée)
  const showPrivacy = false;

  // Form init
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      login: "",
      first_name: "",
      last_name: "",
      age: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      needs_kcal: undefined,
      needs_protein_g: undefined,
      needs_carbs_g: undefined,
      needs_fat_g: undefined,
      needs_display_mode: undefined,
      privacy: {},
    },
  });

  // Populate on load
  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    form.reset({
      login: p.login ?? "",
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      age: p.age ?? undefined,
      height_cm: p.height_cm ?? undefined,
      weight_kg: p.weight_kg ?? undefined,
      needs_kcal: p.needs_kcal ?? undefined,
      needs_protein_g: p.needs_protein_g ?? undefined,
      needs_carbs_g: p.needs_carbs_g ?? undefined,
      needs_fat_g: p.needs_fat_g ?? undefined,
      needs_display_mode: p.needs_display_mode ?? undefined,
      privacy: p.privacy ?? {},
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

  // Login availability check (debounce)
  const [loginStatus, setLoginStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const loginValue = form.watch("login");
  const initial = profileQ.data;
  useEffect(() => {
    const v = (loginValue ?? "").trim();
    if (!v || v.length < 3) {
      setLoginStatus("idle");
      return;
    }
    // Si inchangé vs initial, inutile de vérifier
    if (v.toLowerCase() === (initial?.login ?? "").toLowerCase()) {
      setLoginStatus("idle");
      return;
    }
    setLoginStatus("checking");
    const t = setTimeout(async () => {
      try {
        const ok = await checkLoginAvailable(v);
        setLoginStatus(ok ? "ok" : "taken");
      } catch {
        setLoginStatus("idle");
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginValue, profileQ.data?.login]);

  // Confirmation dialog before save
  const [confirmOpen, setConfirmOpen] = useState(false);
  const changes = useMemo(() => {
    const v = form.getValues();
    const diff: Partial<ProfileInput> = {};
    if (!initial) return diff;
    if ((v.login ?? "") !== (initial.login ?? "")) diff.login = v.login;
    if ((v.first_name ?? "") !== (initial.first_name ?? "")) diff.first_name = v.first_name;
    if ((v.last_name ?? "") !== (initial.last_name ?? "")) diff.last_name = v.last_name;
    if ((v.age ?? undefined) !== (initial.age ?? undefined)) diff.age = v.age;
    if ((v.height_cm ?? undefined) !== (initial.height_cm ?? undefined)) diff.height_cm = v.height_cm;
    if ((v.weight_kg ?? undefined) !== (initial.weight_kg ?? undefined)) diff.weight_kg = v.weight_kg;
    if ((v.needs_kcal ?? undefined) !== (initial.needs_kcal ?? undefined)) diff.needs_kcal = v.needs_kcal;
    if ((v.needs_protein_g ?? undefined) !== (initial.needs_protein_g ?? undefined)) diff.needs_protein_g = v.needs_protein_g;
    if ((v.needs_carbs_g ?? undefined) !== (initial.needs_carbs_g ?? undefined)) diff.needs_carbs_g = v.needs_carbs_g;
    if ((v.needs_fat_g ?? undefined) !== (initial.needs_fat_g ?? undefined)) diff.needs_fat_g = v.needs_fat_g;
    if ((v.needs_display_mode ?? undefined) !== (initial.needs_display_mode ?? undefined)) diff.needs_display_mode = v.needs_display_mode;
    // privacy: comparaison simple par JSON string
    if (JSON.stringify(v.privacy ?? {}) !== JSON.stringify(initial.privacy ?? {})) diff.privacy = v.privacy;
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
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Impossible d'enregistrer.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">Mon Profil</h1>
        {profileQ.data?.is_disabled ? (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            Compte désactivé. Certaines actions peuvent être indisponibles.
          </div>
        ) : null}
        {profileQ.isError ? (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            Erreur chargement profil: {String((profileQ.error as any)?.message ?? profileQ.error)}
          </div>
        ) : null}
        <div className="grid gap-6 max-w-5xl">
          {/* En-tête: Compte + Avatar alignés */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Compte */}
            <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Compte</CardTitle>
              <CardDescription>Informations de base liées à votre compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email/Login</span>
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
                    <AvatarFallback className={user?.user_metadata?.role === "admin" ? "bg-emerald-900 text-white" : undefined}>
                      {((profileQ.data?.first_name?.[0] ?? profileQ.data?.last_name?.[0] ?? "?") as string).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </HoverCardTrigger>
                <HoverCardContent side="top" align="start" className="w-auto p-2">
                  <Avatar className="h-40 w-40">
                    <AvatarImage src={avatarUrl ?? "/placeholder.svg"} alt="Avatar agrandi" />
                    <AvatarFallback className={user?.user_metadata?.role === "admin" ? "bg-emerald-900 text-white" : undefined}>
                      {((profileQ.data?.first_name?.[0] ?? profileQ.data?.last_name?.[0] ?? "?") as string).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </HoverCardContent>
              </HoverCard>
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
                  } catch (err) {
                    const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Upload impossible";
                    toast({ title: "Erreur", description: msg, variant: "destructive" });
                  } finally {
                    if (inputEl) inputEl.value = ""; // reset sans accéder à un event relâché
                  }
                }} />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  title="Charger un avatar"
                  className="h-9 w-9 p-0 rounded-full justify-center"
                >
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Charger</span>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={delAvatar.isPending}
                  onClick={async () => {
                    const ok = window.confirm("Supprimer l'avatar ?");
                    if (!ok) return;
                    try {
                      await delAvatar.mutateAsync(profileQ.data?.avatar_url ?? undefined);
                      setAvatarUrl("/placeholder.svg");
                      toast({ title: "Avatar supprimé" });
                    } catch (e) {
                      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Suppression impossible";
                      toast({ title: "Erreur", description: msg, variant: "destructive" });
                    } finally {
                      setTimeout(() => setAvatarVersion((v) => v + 1), 500);
                    }
                  }}
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Supprimer</span>
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Formulaire profil */}
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Infos personnelles et confidentialité.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                  {/* Ligne 1: Prénom / NOM (uppercase visuel) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input value={field.value ?? ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NOM</FormLabel>
                          <FormControl>
                            <Input className="uppercase" value={field.value ?? ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Ligne 2: Âge / Taille / Poids / IMC */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Âge</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    {/* IMC (lecture seule) avec badge coloré + libellé */}
                    <div>
                      <FormItem>
                        <FormLabel>IMC</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const v = computeBmi(form.getValues("height_cm"), form.getValues("weight_kg"));
                              if (v == null) {
                                return (
                                  <>
                                    <Input className="w-20 md:w-24 flex-none" disabled value="" />
                                    <span className="text-xs text-muted-foreground">—</span>
                                  </>
                                );
                              }
                              const cls = v < 18.5
                                ? "bg-slate-500 text-white"
                                : v < 25
                                  ? "bg-emerald-600 text-white"
                                  : v < 30
                                    ? "bg-orange-500 text-white"
                                    : "bg-red-600 text-white";
                              const label = v < 18.5
                                ? "Sous-poids"
                                : v < 25
                                  ? "Normal"
                                  : v < 30
                                    ? "Surpoids"
                                    : "Obèse";
                              return (
                                <>
                                  <Input className="w-20 md:w-24 flex-none" disabled value={v.toFixed(1)} />
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                                </>
                              );
                            })()}
                          </div>
                        </FormControl>
                      </FormItem>
                    </div>
                  </div>

                  {/* Ligne 3: Besoins (kcal) / Affichage objectifs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="needs_kcal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Besoins (kcal/j)</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="needs_display_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Affichage objectifs</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as any)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Mode d'affichage" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="absolute">Valeurs absolues</SelectItem>
                                <SelectItem value="percentage">Pourcentages</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Ligne 4: Protéines / Glucides / Lipides */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="needs_protein_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protéines (g/j)</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="needs_carbs_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Glucides (g/j)</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="needs_fat_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lipides (g/j)</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Confidentialité par champ (icônes cadenas) - masquée en UI */}
                  {showPrivacy && (
                    <div className="col-span-full rounded-md border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">Confidentialité</div>
                          <div className="text-xs text-muted-foreground">Cadenas vert = public, rouge = privé.</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(["age", "height_cm", "weight_kg"] as const).map((k) => {
                          const isPrivate = !!(form.getValues("privacy") as any)?.[k];
                          return (
                            <div key={k} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                              <span className="text-sm">{k === "age" ? "Âge" : k === "height_cm" ? "Taille" : "Poids"}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                className={`h-8 w-8 p-0 rounded-full ${isPrivate ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white`}
                                onClick={() => {
                                  const priv = { ...(form.getValues("privacy") || {}) } as Record<string, boolean>;
                                  if (isPrivate) delete priv[k]; else priv[k] = true;
                                  form.setValue("privacy", priv, { shouldDirty: true });
                                }}
                                title={isPrivate ? "Privé" : "Public"}
                              >
                                {isPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                {(myPathos.list.data ?? []).map((up, idx) => (
                  <Badge key={`up-${up.id ?? up.pathology_id ?? idx}`} variant="secondary">{up.pathology?.label ?? up.pathology_id}</Badge>
                ))}
                {(myCustom.data ?? [])
                  .filter((c) => !c.is_hidden)
                  .filter((c) => {
                    const code = (c.code || "").toUpperCase();
                    const lbl = (c.label || "").toLowerCase();
                    const alsoSelectedAsDefault = (code && selectedDefaultCodes.has(code)) || (!code && selectedDefaultLabels.has(lbl));
                    return !alsoSelectedAsDefault; // cache si déjà SÉLECTIONNÉE en défaut
                  })
                  .map((c, idx) => (
                    <Badge
                      key={`c-${c.id ?? c.label ?? idx}`}
                      className="bg-emerald-900/60 text-emerald-50 hover:bg-emerald-900"
                    >
                      {c.label}
                    </Badge>
                  ))}
              </div>
              <div className="grid gap-2 max-h-64 overflow-auto border rounded-md p-3">
                {(pathologiesQ.data ?? []).map((p) => {
                  const selected = (myPathos.list.data ?? []).some((up) => up.pathology_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3">
                        <Checkbox checked={selected} onCheckedChange={async (v) => {
                          try {
                            if (v === true) await myPathos.add.mutateAsync(p.id);
                            else await myPathos.remove.mutateAsync(p.id);
                          } catch (e) {
                            const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Action impossible";
                            toast({ title: "Erreur", description: msg, variant: "destructive" });
                          }
                        }} />
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">({p.code})</span>
                      </label>
                      {showAdmin ? (
                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Rendre privé"
                            className="h-8 w-8 p-0 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white justify-center"
                            disabled={demoteDefault.isPending || myPathos.remove.isPending}
                            onClick={async () => {
                              try {
                                // Transfert défaut -> perso
                                await demoteDefault.mutateAsync(p.id);
                                // Retire la sélection défaut de l'utilisateur pour que la perso prenne le relais
                                await myPathos.remove.mutateAsync(p.id);
                                toast({ title: "Rendue privée", description: `${p.label} ajoutée à vos personnelles.` });
                              } catch (e) {
                                const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Transfert impossible";
                                toast({ title: "Erreur", description: msg, variant: "destructive" });
                              }
                            }}
                          >
                            <Lock className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Rendre privé</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Supprimer"
                            className="h-8 w-8 p-0 rounded-full bg-red-600 hover:bg-red-500 text-white justify-center"
                            disabled={delDefault.isPending}
                            onClick={async () => {
                              if (!window.confirm(`Supprimer définitivement "${p.label}" des défauts ?`)) return;
                              try {
                                await delDefault.mutateAsync(p.id);
                                toast({ title: "Supprimée", description: `${p.label} supprimée des défauts.` });
                              } catch (e) {
                                const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Suppression impossible";
                                toast({ title: "Erreur", description: msg, variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Personnelles</div>
        <div className="flex flex-col gap-2 rounded-md border border-emerald-800 bg-emerald-950/40 p-3">
                  {(myCustom.data ?? [])
                    .filter((c) => {
                      const code = (c.code || "").toUpperCase();
                      const lbl = (c.label || "").toLowerCase();
                      const alsoSelectedAsDefault = (code && selectedDefaultCodes.has(code)) || (!code && selectedDefaultLabels.has(lbl));
                      return !alsoSelectedAsDefault; // cache uniquement si aussi sélectionnée en défaut
                    })
                    .map((c) => {
                    const code = (c.code || "").toUpperCase();
                    const lbl = (c.label || "").toLowerCase();
                    const isPromoted = (code && selectedDefaultCodes.has(code)) || (!code && selectedDefaultLabels.has(lbl));
                    return (
          <label key={`c-${c.id}`} className={`flex items-center justify-between gap-3 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 ${c.is_hidden ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!c.is_hidden}
                          onCheckedChange={async (v) => {
                            try {
                const visible = v === true;
                await toggleCustomHidden.mutateAsync({ id: c.id, hidden: !visible });
                            } catch (e) {
                              const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Action impossible";
                              toast({ title: "Erreur", description: msg, variant: "destructive" });
                            }
                          }}
                        />
                        <span className="text-sm">
                          {c.label}
                          {c.code ? <span className="ml-2 text-xs text-emerald-300">({c.code})</span> : null}
                        </span>
                        <span className={`ml-2 text-xs ${c.is_hidden ? "text-emerald-300/60" : "text-emerald-300"}`}>{c.is_hidden ? "Inactif" : "Actif"}</span>
                      </div>
            {user?.user_metadata?.role === "admin" ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Rendre public"
                  className="h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-500 text-white justify-center"
                  disabled={promoteCustom.isPending}
                  onClick={async () => {
                    try {
                      await promoteCustom.mutateAsync([c.id]);
                      toast({ title: "Rendue publique", description: `${c.label} ajoutée aux défauts.` });
                    } catch (e) {
                      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Promotion impossible";
                      toast({ title: "Erreur", description: msg, variant: "destructive" });
                    }
                  }}
                >
                  <Unlock className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Rendre public</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Supprimer"
                  className="h-8 w-8 p-0 rounded-full bg-red-600 hover:bg-red-500 text-white justify-center"
                  disabled={delCustom.isPending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer la pathologie personnelle \"${c.label}\" ?`)) return;
                    try {
                      await delCustom.mutateAsync(c.id);
                      toast({ title: "Supprimée", description: `${c.label} retirée des personnelles.` });
                    } catch (e) {
                      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Suppression impossible";
                      toast({ title: "Erreur", description: msg, variant: "destructive" });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Supprimer</span>
                </Button>
              </div>
            ) : null}
                    </label>
                    );
          })}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    ref={customInputRef}
                    placeholder="Ajouter une pathologie personnelle (cochable/masquable)"
           onKeyDown={async (e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const val = (customInputRef.current?.value || "").trim();
                      if (!val) return;
                      // Vérif si existe déjà en défaut
                      const codeUp = (user?.user_metadata?.role === "admin" ? sanitizeCode(customCode.trim()) : "");
                      const existsDefault = (pathologiesQ.data ?? []).some((p) => p.label.toLowerCase() === val.toLowerCase() || (!!codeUp && p.code?.toUpperCase() === codeUp));
                      if (existsDefault) {
                        toast({ title: "Déjà existante", description: "Cette pathologie existe déjà dans les défauts.", variant: "destructive" });
                        return;
                      }
                      try {
                        const payload = user?.user_metadata?.role === "admin" && customCode.trim() !== ""
                          ? { label: val, code: sanitizeCode(customCode.trim()) }
                          : val;
                        await addCustom.mutateAsync(payload);
                        if (customInputRef.current) customInputRef.current.value = "";
                        setCustomCode("");
            toast({ title: "Pathologie ajoutée" });
                      } catch (err) {
                        const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Ajout impossible";
                        toast({ title: "Erreur", description: msg, variant: "destructive" });
                      }
                    }}
                  />
                  {user?.user_metadata?.role === "admin" ? (
                    <Input
                      className="w-48"
                      placeholder="Code (2 caractères)"
                      value={customCode}
                      maxLength={2}
                      onChange={(e) => setCustomCode(sanitizeCode(e.target.value))}
                    />
                  ) : null}
                  <Button
                    type="button"
                    disabled={addCustom.isPending}
          onClick={async () => {
                      const val = (customInputRef.current?.value || "").trim();
                      if (!val) return;
                      const codeUp = (user?.user_metadata?.role === "admin" ? sanitizeCode(customCode.trim()) : "");
                      const existsDefault = (pathologiesQ.data ?? []).some((p) => p.label.toLowerCase() === val.toLowerCase() || (!!codeUp && p.code?.toUpperCase() === codeUp));
                      if (existsDefault) {
                        toast({ title: "Déjà existante", description: "Cette pathologie existe déjà dans les défauts.", variant: "destructive" });
                        return;
                      }
                      try {
                        const payload = user?.user_metadata?.role === "admin" && customCode.trim() !== ""
                          ? { label: val, code: sanitizeCode(customCode.trim()) }
                          : val;
                        await addCustom.mutateAsync(payload);
                        if (customInputRef.current) customInputRef.current.value = "";
                        setCustomCode("");
            toast({ title: "Pathologie ajoutée" });
                      } catch (err) {
                        const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Ajout impossible";
                        toast({ title: "Erreur", description: msg, variant: "destructive" });
                      }
                    }}
                  >
                    {addCustom.isPending ? "Ajout…" : "Ajouter"}
                  </Button>
                </div>
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
                  {Object.entries(changes).map(([k, v]) => {
                    const labels: Record<string, string> = {
                      login: "Identifiant",
                      first_name: "Prénom",
                      last_name: "Nom",
                      age: "Âge",
                      height_cm: "Taille (cm)",
                      weight_kg: "Poids (kg)",
                      needs_kcal: "Besoins (kcal/j)",
                      needs_protein_g: "Protéines (g/j)",
                      needs_carbs_g: "Glucides (g/j)",
                      needs_fat_g: "Lipides (g/j)",
                      needs_display_mode: "Affichage objectifs",
                      privacy: "Confidentialité",
                    };
                    const label = labels[k] || k;
                    const value = k === "privacy" ? "(modifié)" : String(v);
                    return (
                      <li key={k}><span className="font-medium">{label}</span>: {value}</li>
                    );
                  })}
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
