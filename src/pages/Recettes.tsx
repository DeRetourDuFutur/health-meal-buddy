import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAddRecipeItem, useCreateRecipe, useDeleteRecipe, useDeleteRecipeItem, useRecipes, useUpdateRecipe, useUpdateRecipeItem } from "@/hooks/useRecipes";
import { computeRecipeTotals, recipeSchema, type RecipeInput, type RecipeItem, type RecipeWithItems } from "@/lib/db/recipes";
import { useAliments } from "@/hooks/useAliments";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

function RecipeForm({ defaultValues, submitting, onSubmit }:{ defaultValues: RecipeInput; submitting?: boolean; onSubmit: (v: RecipeInput)=>void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<RecipeInput>({
    resolver: zodResolver(recipeSchema),
    defaultValues,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" {...register("name")} placeholder="Salade de poulet" />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="servings">Portions</Label>
        <Input id="servings" type="number" min="1" step="1" {...register("servings", { valueAsNumber: true })} />
        {errors.servings && <p className="text-sm text-red-600">{errors.servings.message}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Notes (optionnel)" {...register("notes")} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>{submitting ? "Enregistrement..." : "Enregistrer"}</Button>
      </DialogFooter>
    </form>
  );
}

function ItemsEditor({ recipe, onClose }:{ recipe: RecipeWithItems; onClose: ()=>void }) {
  const { toast } = useToast();
  const { data: aliments } = useAliments();
  const addItem = useAddRecipeItem();
  const updItem = useUpdateRecipeItem();
  const delItem = useDeleteRecipeItem();

  const [alimentId, setAlimentId] = useState<string>("");
  const [qty, setQty] = useState<number>(0);

  const totals = useMemo(() => computeRecipeTotals(recipe.items, recipe.servings), [recipe.items, recipe.servings]);

  const onAdd = async () => {
    if (!alimentId) return;
    try {
      await addItem.mutateAsync({ recipe_id: recipe.id, input: { aliment_id: alimentId, quantity_g: qty } });
      setAlimentId(""); setQty(0);
      toast({ title: "Ajouté", description: "Ingrédient ajouté." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d’ajouter l’ingrédient.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const onQtyChange = async (item: RecipeItem, value: number) => {
    try {
      await updItem.mutateAsync({ id: item.id, quantity_g: value });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de modifier la quantité.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const onDelete = async (item: RecipeItem) => {
    const ok = window.confirm(`Supprimer ${item.aliment?.name ?? "cet ingrédient"} ?`);
    if (!ok) return;
    try {
      await delItem.mutateAsync({ id: item.id });
      toast({ title: "Supprimé", description: "Ingrédient supprimé." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de supprimer l’ingrédient.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Aliment</Label>
          <Select value={alimentId} onValueChange={(v) => setAlimentId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un aliment" />
            </SelectTrigger>
            <SelectContent>
              {(aliments ?? []).map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantité (g)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={Number.isNaN(qty) ? 0 : qty}
            onChange={(e) => {
              const v = Number(e.target.value);
              setQty(Number.isNaN(v) ? 0 : v);
            }}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={onAdd} disabled={!alimentId || !qty || qty <= 0}>Ajouter</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aliment</TableHead>
            <TableHead className="text-right">Quantité (g)</TableHead>
            <TableHead className="text-right">kcal</TableHead>
            <TableHead className="text-right">Prot</TableHead>
            <TableHead className="text-right">Gluc</TableHead>
            <TableHead className="text-right">Lip</TableHead>
            <TableHead className="w-[1%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipe.items.map(item => {
            const factor = (item.quantity_g || 0) / 100;
            const kcal = factor * (Number(item.aliment?.kcal_per_100g) || 0);
            const prot = factor * (Number(item.aliment?.protein_g_per_100g) || 0);
            const carb = factor * (Number(item.aliment?.carbs_g_per_100g) || 0);
            const fat = factor * (Number(item.aliment?.fat_g_per_100g) || 0);
            return (
              <TableRow key={item.id}>
                <TableCell>{item.aliment?.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity_g}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onQtyChange(item, Number.isNaN(v) ? 0 : v);
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">{kcal.toFixed(1)}</TableCell>
                <TableCell className="text-right">{prot.toFixed(1)}</TableCell>
                <TableCell className="text-right">{carb.toFixed(1)}</TableCell>
                <TableCell className="text-right">{fat.toFixed(1)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>Supprimer</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Totaux</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-2 text-right">
            <div><div className="text-muted-foreground text-xs">kcal</div><div>{totals.kcal.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Prot</div><div>{totals.protein_g.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Gluc</div><div>{totals.carbs_g.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Lip</div><div>{totals.fat_g.toFixed(1)}</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Par portion</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-2 text-right">
            <div><div className="text-muted-foreground text-xs">kcal</div><div>{totals.perServing.kcal.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Prot</div><div>{totals.perServing.protein_g.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Gluc</div><div>{totals.perServing.carbs_g.toFixed(1)}</div></div>
            <div><div className="text-muted-foreground text-xs">Lip</div><div>{totals.perServing.fat_g.toFixed(1)}</div></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

const Recettes = () => {
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useRecipes();
  const createMut = useCreateRecipe();
  const updateMut = useUpdateRecipe();
  const deleteMut = useDeleteRecipe();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<{ open: boolean; recipe?: RecipeWithItems | null }>({ open: false, recipe: null });

  const onCreate = async (values: RecipeInput) => {
    try {
      await createMut.mutateAsync(values);
      setOpenCreate(false);
      toast({ title: "Créé", description: "Recette créée." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de créer la recette.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const onUpdate = async (values: RecipeInput) => {
    if (!openEdit.recipe) return;
    try {
      await updateMut.mutateAsync({ id: openEdit.recipe.id, input: values });
      toast({ title: "Modifié", description: "Recette mise à jour." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de modifier la recette.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  const onDelete = async (r: RecipeWithItems) => {
    const ok = window.confirm(`Supprimer la recette « ${r.name} » ?`);
    if (!ok) return;
    try {
      await deleteMut.mutateAsync({ id: r.id });
      toast({ title: "Supprimé", description: "Recette supprimée." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de supprimer la recette.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Recettes</h1>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild><Button>Nouvelle recette</Button></DialogTrigger>
            <DialogContent aria-describedby="create-recipe-desc">
              <DialogHeader><DialogTitle>Nouvelle recette</DialogTitle></DialogHeader>
              <DialogDescription id="create-recipe-desc" className="sr-only">
                Créez une recette en indiquant son nom, le nombre de portions et des notes éventuelles.
              </DialogDescription>
              <RecipeForm defaultValues={{ name: "", servings: 1, notes: "" }} submitting={createMut.isPending} onSubmit={onCreate} />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p className="text-muted-foreground">Chargement...</p>}
        {isError && <p className="text-red-600">{error?.message ?? "Erreur de chargement."}</p>}
        {!isLoading && !isError && (
          <Card>
            <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
            <CardContent>
              {(!data || data.length === 0) ? (
                <div className="text-sm text-muted-foreground">Aucune recette. Créez votre première recette.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">Ingrédients</TableHead>
                      <TableHead className="text-right">kcal (tot)</TableHead>
                      <TableHead className="text-right">Prot (tot)</TableHead>
                      <TableHead className="text-right">Gluc (tot)</TableHead>
                      <TableHead className="text-right">Lip (tot)</TableHead>
                      <TableHead className="text-right">kcal/portion</TableHead>
                      <TableHead className="text-right">Prot/portion</TableHead>
                      <TableHead className="text-right">Gluc/portion</TableHead>
                      <TableHead className="text-right">Lip/portion</TableHead>
                      <TableHead className="w-[1%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map(r => {
                      const totals = computeRecipeTotals(r.items, r.servings);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right">{r.items.length}</TableCell>
                          <TableCell className="text-right">{totals.kcal.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.protein_g.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.carbs_g.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.fat_g.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.perServing.kcal.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.perServing.protein_g.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.perServing.carbs_g.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{totals.perServing.fat_g.toFixed(1)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Dialog
                                open={openEdit.open && openEdit.recipe?.id === r.id}
                                onOpenChange={(v) => setOpenEdit({ open: v, recipe: v ? r : null })}
                              >
                                <DialogTrigger asChild><Button variant="outline" size="sm">Éditer</Button></DialogTrigger>
                                <DialogContent className="max-w-4xl overflow-y-auto max-h-[85vh]" aria-describedby={`edit-recipe-desc-${r.id}`}>
                                  <DialogHeader><DialogTitle>Éditer: {r.name}</DialogTitle></DialogHeader>
                                  <DialogDescription id={`edit-recipe-desc-${r.id}`} className="sr-only">
                                    Modifiez les détails de la recette et ses ingrédients, puis enregistrez vos changements.
                                  </DialogDescription>
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                      <h3 className="font-semibold mb-2">Détails</h3>
                                      <RecipeForm
                                        defaultValues={{ name: r.name, servings: Number(r.servings), notes: r.notes ?? "" }}
                                        submitting={updateMut.isPending}
                                        onSubmit={onUpdate}
                                      />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2">Ingrédients</h3>
                                      <ItemsEditor recipe={r} onClose={() => setOpenEdit({ open: false, recipe: null })} />
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button variant="destructive" size="sm" onClick={() => onDelete(r)}>Supprimer</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Recettes;
