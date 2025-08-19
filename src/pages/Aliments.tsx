import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AccessibleDialog } from "@/components/ui/AccessibleDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// (sélecteur retiré avec la simplification de la barre d'outils)
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlimentsPaged, useCreateAliment, useDeleteAliment, useUpdateAliment } from "@/hooks/useAliments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlimentInput, alimentSchema, Aliment, listCategories } from "@/lib/db/aliments";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";
import { useFoodPreferences, useRemoveFoodPreference, useSetFoodPreference } from "@/hooks/useFoodPreferences";
import { useAuth } from "@/context/AuthContext";
import { useMyProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { X, Pencil, Trash } from "lucide-react";

function AlimentForm({
  defaultValues,
  onSubmit,
  submitting,
}: {
  defaultValues: AlimentInput;
  onSubmit: (values: AlimentInput) => void;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AlimentInput>({
    resolver: zodResolver(alimentSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" placeholder="Pomme" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="kcal_per_100g">kcal / 100g</Label>
          <Input id="kcal_per_100g" type="number" step="0.01" min="0" {...register("kcal_per_100g", { valueAsNumber: true })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="protein_g_per_100g">Protéines g / 100g</Label>
          <Input id="protein_g_per_100g" type="number" step="0.01" min="0" {...register("protein_g_per_100g", { valueAsNumber: true })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="carbs_g_per_100g">Glucides g / 100g</Label>
          <Input id="carbs_g_per_100g" type="number" step="0.01" min="0" {...register("carbs_g_per_100g", { valueAsNumber: true })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fat_g_per_100g">Lipides g / 100g</Label>
          <Input id="fat_g_per_100g" type="number" step="0.01" min="0" {...register("fat_g_per_100g", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Notes libres (optionnel)" {...register("notes")} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function parseNumber(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function EditAlimentDialog({
  a,
  isOpen,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  a: Aliment;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  submitting: boolean;
  onSubmit: (values: AlimentInput) => void;
}) {
  const idBase = `edit-aliment-${a?.id ?? "temp"}`;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Éditer" title="Éditer">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <AccessibleDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        idBase={idBase}
        title="Modifier l’aliment"
        description={`Modifier l’aliment « ${a.name} »`}
        body={
          <AlimentForm
            defaultValues={{
              name: a.name,
              kcal_per_100g: Number(a.kcal_per_100g),
              protein_g_per_100g: Number(a.protein_g_per_100g),
              carbs_g_per_100g: Number(a.carbs_g_per_100g),
              fat_g_per_100g: Number(a.fat_g_per_100g),
              notes: a.notes ?? "",
            }}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        }
      />
    </Dialog>
  );
}

const Aliments = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile();
  const authRole = (user as any)?.user_metadata?.role || (user as any)?.role || (user as any)?.app_metadata?.role || (((user as any)?.app_metadata?.roles?.includes?.("admin")) ? "admin" : undefined);
  const profileRole = (myProfile as any)?.user?.user_metadata?.role || (myProfile as any)?.user_metadata?.role || (myProfile as any)?.role;
  const isAdmin = authRole === "admin" || profileRole === "admin";

  // URL → params
  const urlParams = useMemo(() => {
    const q = searchParams.get("q") ?? "";
    const categorySlug = (searchParams.get("category") ?? "all").toLowerCase();
    const sortRaw = searchParams.get("sort") ?? "name:asc";
    const [by = "name", dirRaw = "asc"] = sortRaw.split(":");
    const dir = (dirRaw === "desc" ? "desc" : "asc") as "asc" | "desc";
    const page = parseNumber(searchParams.get("page")) ?? 1;
    const pageSize = parseNumber(searchParams.get("pageSize")) ?? 10; // plus d’UI, mais on supporte l’URL
    return {
      q,
      categorySlug,
      sort: [{ by: by as any, dir }],
      page: page < 1 ? 1 : page,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10,
    };
  }, [searchParams]);

  // Recherche avec debounce
  const [qInput, setQInput] = useState(urlParams.q ?? "");
  useEffect(() => { setQInput(urlParams.q ?? ""); }, [urlParams.q]);
  // Option B — mémoriser la dernière catégorie choisie par l'utilisateur.
  // Initialisé à la catégorie actuelle de l'URL (ou "all"), puis mis à jour uniquement sur clic d'onglet.
  const [lastCategorySlug, setLastCategorySlug] = useState<string>((searchParams.get("category") ?? "all").toLowerCase());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const current = new URLSearchParams(searchParams);
      if ((qInput ?? "") !== (urlParams.q ?? "")) {
        if (!qInput) current.delete("q"); else current.set("q", qInput);
        const hasQuery = (qInput ?? "").trim().length > 0;
        if (hasQuery) {
          current.delete("category");
        } else {
    // Restaurer la dernière catégorie choisie quand la recherche est vidée
    const last = lastCategorySlug;
    if (last && last !== "all") current.set("category", last); else current.delete("category");
        }
        current.set("page", "1");
        setSearchParams(current, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, lastCategorySlug]);

  // (déplacé plus bas après la déclaration de `data`)

  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
      } catch {}
    })();
  }, []);

  function slugify(x: string) {
    return x
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function unslugify(slug: string): string | undefined {
    if (!slug || slug === "all") return undefined;
    return categories.find((c) => slugify(c) === slug);
  }
  const effectiveCategory = unslugify(urlParams.categorySlug);

  const { data, isLoading, isError, error } = useAlimentsPaged({
    q: urlParams.q,
    category: effectiveCategory ?? "All",
    sort: urlParams.sort,
    page: urlParams.page,
    pageSize: urlParams.pageSize,
  });

  const prefs = useFoodPreferences();
  const setPref = useSetFoodPreference();
  const clearPref = useRemoveFoodPreference();
  const createMut = useCreateAliment();
  const paramsKey = {
    q: urlParams.q,
    category: effectiveCategory ?? "All",
    sort: urlParams.sort,
    page: urlParams.page,
    pageSize: urlParams.pageSize,
  } as const;
  const updateMut = useUpdateAliment(paramsKey);
  const deleteMut = useDeleteAliment();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<{ open: boolean; item?: Aliment | null }>({ open: false, item: null });

  // Auto-switch désactivé: on ne force plus la catégorie d'onglet selon les résultats.

  const onCreate = async (values: AlimentInput) => {
    try {
      await createMut.mutateAsync(values);
      setOpenCreate(false);
      toast({ title: "Créé", description: "Aliment ajouté avec succès." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de créer l'aliment.", variant: "destructive" });
    }
  };

  const onEdit = async (values: AlimentInput) => {
    if (!openEdit.item) return;
    try {
      await updateMut.mutateAsync({ id: openEdit.item.id, input: values });
      setOpenEdit({ open: false, item: null });
      toast({ title: "Modifié", description: "Aliment mis à jour." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de modifier l'aliment.", variant: "destructive" });
    }
  };

  const onDelete = async (item: Aliment) => {
    const ok = window.confirm(`Supprimer « ${item.name} » ?`);
    if (!ok) return;
    try {
      await deleteMut.mutateAsync({ id: item.id });
      toast({ title: "Supprimé", description: "Aliment supprimé." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de supprimer l'aliment.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Aliments</h1>
          {isAdmin && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button>Nouveau</Button>
              </DialogTrigger>
              <AccessibleDialog
                open={openCreate}
                onOpenChange={setOpenCreate}
                idBase="create-aliment"
                title="Nouvel aliment"
                description="Créer un nouvel aliment dans le catalogue"
                body={
                  <AlimentForm
                    defaultValues={{ name: "", kcal_per_100g: 0, protein_g_per_100g: 0, carbs_g_per_100g: 0, fat_g_per_100g: 0, notes: "" }}
                    onSubmit={onCreate}
                    submitting={createMut.isPending}
                  />
                }
              />
            </Dialog>
          )}
        </div>

        {/* Onglets catégories dynamiques */}
        <div className="mb-4 flex flex-wrap gap-2">
          {["All", ...categories].map((c) => {
            const slug = c === "All" ? "all" : slugify(c);
            const active = (searchParams.get("category") ?? "all") === slug;
      return (
              <button
                key={slug}
  onClick={() => { setLastCategorySlug(slug); const sp = new URLSearchParams(searchParams); if (slug === "all") sp.delete("category"); else sp.set("category", slug); sp.set("page", "1"); setSearchParams(sp); }}
                className={cn("px-3 py-1 rounded-full text-sm border", active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}
                aria-pressed={active}
                aria-label={`Catégorie ${c}`}
                title={c}
              >{c}</button>
            );
          })}
        </div>

        {/* Barre de recherche simplifiée */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <Label htmlFor="search">Recherche</Label>
                <div className="relative">
                  <Input
                    id="search"
                    ref={searchInputRef}
                    placeholder="Rechercher par nom"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    className={qInput ? "pr-9" : undefined}
                  />
                  {qInput && (
                    <button
                      type="button"
                      onClick={() => { setQInput(""); searchInputRef.current?.focus(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Effacer la recherche"
                      title="Effacer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card><CardContent className="p-6 space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </CardContent></Card>
        )}
        {isError && <p className="text-red-600">{error?.message ?? "Erreur de chargement."}</p>}
        {!isLoading && !isError && data && (
          <Card>
            <CardHeader>
              <CardTitle>Liste (tri par nom)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.total === 0 ? (
                (urlParams.q && urlParams.q.length > 0) ? (
                  <div className="text-sm text-muted-foreground">Aucun résultat pour ces critères.</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun aliment. Créez votre premier aliment.</div>
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button className="font-medium" onClick={() => { const sp = new URLSearchParams(searchParams); const [by, dir] = (sp.get("sort") ?? "name:asc").split(":"); const next = by === "name" && dir === "asc" ? "name:desc" : "name:asc"; sp.set("sort", next); setSearchParams(sp); }}>
                          Nom {((searchParams.get("sort") ?? "name:asc").startsWith("name:")) ? ((searchParams.get("sort") ?? "").endsWith(":desc") ? "↓" : "↑") : ""}
                        </button>
                      </TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => { const sp = new URLSearchParams(searchParams); const s = sp.get("sort") ?? "name:asc"; const isThis = s.startsWith("kcal:"); const next = isThis && s.endsWith(":asc") ? "kcal:desc" : "kcal:asc"; sp.set("sort", next); setSearchParams(sp); }}>kcal/100g {((searchParams.get("sort") ?? "").startsWith("kcal:")) ? ((searchParams.get("sort") ?? "").endsWith(":desc") ? "↓" : "↑") : ""}</button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => { const sp = new URLSearchParams(searchParams); const s = sp.get("sort") ?? "name:asc"; const isThis = s.startsWith("prot:"); const next = isThis && s.endsWith(":asc") ? "prot:desc" : "prot:asc"; sp.set("sort", next); setSearchParams(sp); }}>Prot {((searchParams.get("sort") ?? "").startsWith("prot:")) ? ((searchParams.get("sort") ?? "").endsWith(":desc") ? "↓" : "↑") : ""}</button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => { const sp = new URLSearchParams(searchParams); const s = sp.get("sort") ?? "name:asc"; const isThis = s.startsWith("carb:"); const next = isThis && s.endsWith(":asc") ? "carb:desc" : "carb:asc"; sp.set("sort", next); setSearchParams(sp); }}>Gluc {((searchParams.get("sort") ?? "").startsWith("carb:")) ? ((searchParams.get("sort") ?? "").endsWith(":desc") ? "↓" : "↑") : ""}</button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => { const sp = new URLSearchParams(searchParams); const s = sp.get("sort") ?? "name:asc"; const isThis = s.startsWith("fat:"); const next = isThis && s.endsWith(":asc") ? "fat:desc" : "fat:asc"; sp.set("sort", next); setSearchParams(sp); }}>Lip {((searchParams.get("sort") ?? "").startsWith("fat:")) ? ((searchParams.get("sort") ?? "").endsWith(":desc") ? "↓" : "↑") : ""}</button>
                      </TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right w-[1%]"></TableHead>
                      <TableHead className="w-[1%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className={cn("font-medium", (prefs.data?.[a.id] === "allergy") ? "text-red-700 line-through" : undefined)}>{a.name}</TableCell>
                        <TableCell>{(a as any).category ?? ""}</TableCell>
                        <TableCell className="text-right">{a.kcal_per_100g}</TableCell>
                        <TableCell className="text-right">{a.protein_g_per_100g}</TableCell>
                        <TableCell className="text-right">{a.carbs_g_per_100g}</TableCell>
                        <TableCell className="text-right">{a.fat_g_per_100g}</TableCell>
                        <TableCell className="truncate max-w-[300px]">{a.notes}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {/* Préférences exclusives */}
                            {(() => {
                              const current = prefs.data?.[a.id];
                              const paramsKey = { ...urlParams, category: effectiveCategory ?? "All" };
                              const btnClass = "px-2 py-1 rounded text-sm border";
                              return (
                                <div className="flex gap-2">
                                  <button
                                    className={btnClass}
                                    onClick={async () => { try { if (current === "like") await clearPref.mutateAsync({ alimentId: a.id, paramsKey }); else await setPref.mutateAsync({ alimentId: a.id, pref: "like", paramsKey }); } catch (e: any) { toast({ title: "Erreur", description: e?.message ?? "Échec préférence.", variant: "destructive" }); } }}
                                    aria-pressed={current === "like"}
                                    aria-label={`J'aime ${a.name}`}
                                    title="J'aime"
                                    style={{ backgroundColor: current === "like" ? "#16a34a" : undefined, color: current === "like" ? "white" : undefined }}
                                  >👍</button>
                                  <button
                                    className={btnClass}
                                    onClick={async () => { try { if (current === "dislike") await clearPref.mutateAsync({ alimentId: a.id, paramsKey }); else await setPref.mutateAsync({ alimentId: a.id, pref: "dislike", paramsKey }); } catch (e: any) { toast({ title: "Erreur", description: e?.message ?? "Échec préférence.", variant: "destructive" }); } }}
                                    aria-pressed={current === "dislike"}
                                    aria-label={`J'aime pas ${a.name}`}
                                    title="J'aime pas"
                                    style={{ backgroundColor: current === "dislike" ? "#f59e0b" : undefined, color: current === "dislike" ? "black" : undefined }}
                                  >👎</button>
                                  <button
                                    className={btnClass}
                                    onClick={async () => { try { if (current === "allergy") await clearPref.mutateAsync({ alimentId: a.id, paramsKey }); else await setPref.mutateAsync({ alimentId: a.id, pref: "allergy", paramsKey }); } catch (e: any) { toast({ title: "Erreur", description: e?.message ?? "Échec préférence.", variant: "destructive" }); } }}
                                    aria-pressed={current === "allergy"}
                                    aria-label={`Allergie ${a.name}`}
                                    title="Allergie"
                                    style={{ backgroundColor: current === "allergy" ? "#dc2626" : undefined, color: current === "allergy" ? "white" : undefined }}
                                  >🚫</button>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            {isAdmin && (
                              <>
                                <EditAlimentDialog
                                  a={a}
                                  isOpen={openEdit.open && openEdit.item?.id === a.id}
                                  onOpenChange={(v) => setOpenEdit({ open: v, item: v ? a : null })}
                                  submitting={updateMut.isPending}
                                  onSubmit={onEdit}
                                />
                                <Button variant="destructive" size="sm" onClick={() => onDelete(a)} disabled={deleteMut.isPending} aria-label="Supprimer" title="Supprimer">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {data.total > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {`Total: ${data.total} • Page ${data.page} / ${data.pageCount}`}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={data.page <= 1}
                      onClick={() => { const sp = new URLSearchParams(searchParams); const p = Math.max(1, (urlParams.page ?? 1) - 1); sp.set("page", String(p)); setSearchParams(sp); }}>Précédent</Button>
                    <Button variant="outline" size="sm" disabled={data.page >= data.pageCount}
                      onClick={() => { const sp = new URLSearchParams(searchParams); const p = Math.min((urlParams.page ?? 1) + 1, data.pageCount); sp.set("page", String(p)); setSearchParams(sp); }}>Suivant</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Aliments;
