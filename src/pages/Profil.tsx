import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
// Avatar/Compte/Form extraits en composants dédiés
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  useMyProfile,
  usePathologies,
  useMyPathologies,
  useMyProfileHistory,
  useMyCustomPathologies,
  useAddMyCustomPathology,
  useToggleMyCustomPathologyHidden,
  usePromoteCustomPathologies,
  useDemoteDefaultPathologyToCustom,
  useAdminDeleteDefaultPathology,
  useAdminDeleteCustomPathology,
} from "@/hooks/useProfile";
import type { ProfileInput } from "@/lib/db/profiles";
import { profileInputSchema } from "@/lib/db/profiles";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { AvatarManagerCard } from "./profile/components/AvatarManagerCard";
import { AccountInfoCard } from "./profile/components/AccountInfoCard";
import { ProfileForm } from "./profile/components/ProfileForm";

const Profil = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Queries & mutations
  const profileQ = useMyProfile();
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
  const initial = profileQ.data;

  // Initiales pour l'avatar
  const initials = useMemo(() => {
    const f = (profileQ.data?.first_name || "").trim();
    const l = (profileQ.data?.last_name || "").trim();
    const base = (f ? f[0] : "") + (l ? l[0] : "");
    return (base || (user?.email?.[0] ?? "?")).toUpperCase();
  }, [profileQ.data?.first_name, profileQ.data?.last_name, user?.email]);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AccountInfoCard email={user?.email} userId={user?.id} createdAt={(user as any)?.created_at ?? null} />
          <AvatarManagerCard
            initialAvatarPath={profileQ.data?.avatar_url}
            userRoleIsAdmin={showAdmin}
            initials={initials}
          />
        </div>

        <ProfileForm form={form} initial={initial} showPrivacy={showPrivacy} />

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
                  .map((c) => (
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
                  ))}
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
    </AppLayout>
  );
};

export default Profil;
