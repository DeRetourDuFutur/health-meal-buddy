import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessibleDialog } from "@/components/ui/AccessibleDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { computeBmi, checkLoginAvailable, useUpsertMyProfile } from "@/hooks/useProfile";
import type { ProfileInput } from "@/lib/db/profiles";
import type { UseFormReturn } from "react-hook-form";

type ProfileFormProps = {
  form: UseFormReturn<ProfileInput>;
  initial: Partial<ProfileInput> | undefined;
  showPrivacy?: boolean;
};

export function ProfileForm({ form, initial, showPrivacy = false }: ProfileFormProps) {
  const { toast } = useToast();
  const upsert = useUpsertMyProfile();

  // Login availability check (debounce)
  const [loginStatus, setLoginStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const loginValue = form.watch("login");
  useEffect(() => {
    const v = (loginValue ?? "").trim();
    if (!v || v.length < 3) {
      setLoginStatus("idle");
      return;
    }
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
  }, [loginValue, initial?.login]);

  // Compute changes vs initial
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
    if (JSON.stringify(v.privacy ?? {}) !== JSON.stringify(initial.privacy ?? {})) diff.privacy = v.privacy;
    return diff;
  }, [form.watch(), initial]);

  const hasChanges = Object.keys(changes).length > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <>
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
                    {["age", "height_cm", "weight_kg"].map((k) => {
                      const isPrivate = !!(form.getValues("privacy") as any)?.[k as string];
                      return (
                        <div key={k} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                          <span className="text-sm">{k === "age" ? "Âge" : k === "height_cm" ? "Taille" : "Poids"}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            className={`h-8 w-8 p-0 rounded-full ${isPrivate ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white`}
                            onClick={() => {
                              const priv = { ...(form.getValues("privacy") || {}) } as Record<string, boolean>;
                              if (isPrivate) delete priv[k as string]; else priv[k as string] = true;
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

      {/* Confirmation dialog */}
      <AccessibleDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        idBase="profile-confirm"
        title="Confirmer les modifications"
        description="Vérifiez les changements avant d’enregistrer"
        body={
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
        }
        footer={
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button onClick={doSave} disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Confirmer"}</Button>
          </DialogFooter>
        }
      />
    </>
  );
}
