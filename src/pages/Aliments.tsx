import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useAlimentsPaged, useCreateAliment, useDeleteAliment, useUpdateAliment } from "@/hooks/useAliments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlimentInput, alimentSchema, Aliment } from "@/lib/db/aliments";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";

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

const Aliments = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL → params
  const urlParams = useMemo(() => {
    const q = searchParams.get("q") ?? "";
    const kcalMin = parseNumber(searchParams.get("kcalMin"));
    const kcalMax = parseNumber(searchParams.get("kcalMax"));
    const protMin = parseNumber(searchParams.get("protMin"));
    const protMax = parseNumber(searchParams.get("protMax"));
    const carbMin = parseNumber(searchParams.get("carbMin"));
    const carbMax = parseNumber(searchParams.get("carbMax"));
    const fatMin = parseNumber(searchParams.get("fatMin"));
    const fatMax = parseNumber(searchParams.get("fatMax"));
    const sortRaw = searchParams.get("sort") ?? "name:asc";
  const [by = "name", dirRaw = "asc"] = sortRaw.split(":");
  const dir = (dirRaw === "desc" ? "desc" : "asc") as "asc" | "desc";
    const page = parseNumber(searchParams.get("page")) ?? 1;
    const pageSize = parseNumber(searchParams.get("pageSize")) ?? 10;
    return {
      q,
      filters: { kcalMin, kcalMax, protMin, protMax, carbMin, carbMax, fatMin, fatMax },
  sort: [{ by: by as any, dir }],
      page: page < 1 ? 1 : page,
      pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10,
    };
  }, [searchParams]);

  // Recherche avec debounce
  const [qInput, setQInput] = useState(urlParams.q ?? "");
  useEffect(() => { setQInput(urlParams.q ?? ""); }, [urlParams.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      const current = new URLSearchParams(searchParams);
      if ((qInput ?? "") !== (urlParams.q ?? "")) {
        if (!qInput) current.delete("q"); else current.set("q", qInput);
        current.set("page", "1"); // reset page on search change
        setSearchParams(current, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isLoading, isError, error } = useAlimentsPaged(urlParams);
  const createMut = useCreateAliment();
  const updateMut = useUpdateAliment();
  const deleteMut = useDeleteAliment();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<{ open: boolean; item?: Aliment | null }>({ open: false, item: null });

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
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>Nouveau</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel aliment</DialogTitle>
              </DialogHeader>
              <AlimentForm
                defaultValues={{ name: "", kcal_per_100g: 0, protein_g_per_100g: 0, carbs_g_per_100g: 0, fat_g_per_100g: 0, notes: "" }}
                onSubmit={onCreate}
                submitting={createMut.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Barre d'outils */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <Label htmlFor="search">Recherche</Label>
                <Input id="search" placeholder="Rechercher par nom" value={qInput} onChange={(e) => setQInput(e.target.value)} />
              </div>
              <div>
                <Label>kcal min</Label>
                <Input type="number" min="0" value={searchParams.get("kcalMin") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("kcalMin"); else sp.set("kcalMin", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>kcal max</Label>
                <Input type="number" min="0" value={searchParams.get("kcalMax") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("kcalMax"); else sp.set("kcalMax", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Taille page</Label>
                <Select value={String(urlParams.pageSize)} onValueChange={(v) => { const sp = new URLSearchParams(searchParams); sp.set("pageSize", v); sp.set("page","1"); setSearchParams(sp); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mt-4">
              <div>
                <Label>Prot min</Label>
                <Input type="number" min="0" value={searchParams.get("protMin") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("protMin"); else sp.set("protMin", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Prot max</Label>
                <Input type="number" min="0" value={searchParams.get("protMax") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("protMax"); else sp.set("protMax", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Gluc min</Label>
                <Input type="number" min="0" value={searchParams.get("carbMin") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("carbMin"); else sp.set("carbMin", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Gluc max</Label>
                <Input type="number" min="0" value={searchParams.get("carbMax") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("carbMax"); else sp.set("carbMax", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Lip min</Label>
                <Input type="number" min="0" value={searchParams.get("fatMin") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("fatMin"); else sp.set("fatMin", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
              <div>
                <Label>Lip max</Label>
                <Input type="number" min="0" value={searchParams.get("fatMax") ?? ""}
                  onChange={(e) => { const sp = new URLSearchParams(searchParams); const v = e.target.value; if (!v) sp.delete("fatMax"); else sp.set("fatMax", v); sp.set("page","1"); setSearchParams(sp); }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && <p className="text-muted-foreground">Chargement...</p>}
        {isError && <p className="text-red-600">{error?.message ?? "Erreur de chargement."}</p>}
        {!isLoading && !isError && data && (
          <Card>
            <CardHeader>
              <CardTitle>Liste (tri par nom)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.total === 0 ? (
                (urlParams.q || Object.values(urlParams.filters ?? {}).some((v) => v !== undefined)) ? (
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
                      <TableHead className="w-[1%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">{a.kcal_per_100g}</TableCell>
                        <TableCell className="text-right">{a.protein_g_per_100g}</TableCell>
                        <TableCell className="text-right">{a.carbs_g_per_100g}</TableCell>
                        <TableCell className="text-right">{a.fat_g_per_100g}</TableCell>
                        <TableCell className="truncate max-w-[300px]">{a.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Dialog
                              open={openEdit.open && openEdit.item?.id === a.id}
                              onOpenChange={(v) => setOpenEdit({ open: v, item: v ? a : null })}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Éditer</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modifier l’aliment</DialogTitle>
                                </DialogHeader>
                                <AlimentForm
                                  defaultValues={{
                                    name: a.name,
                                    kcal_per_100g: Number(a.kcal_per_100g),
                                    protein_g_per_100g: Number(a.protein_g_per_100g),
                                    carbs_g_per_100g: Number(a.carbs_g_per_100g),
                                    fat_g_per_100g: Number(a.fat_g_per_100g),
                                    notes: a.notes ?? "",
                                  }}
                                  onSubmit={onEdit}
                                  submitting={updateMut.isPending}
                                />
                              </DialogContent>
                            </Dialog>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(a)} disabled={deleteMut.isPending}>Supprimer</Button>
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
