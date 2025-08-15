import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useAliments, useCreateAliment, useDeleteAliment, useUpdateAliment } from "@/hooks/useAliments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlimentInput, alimentSchema, Aliment } from "@/lib/db/aliments";
import { useToast } from "@/components/ui/use-toast";

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

const Aliments = () => {
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useAliments();
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
        <div className="flex items-center justify-between mb-4">
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

        {isLoading && <p className="text-muted-foreground">Chargement...</p>}
        {isError && <p className="text-red-600">{error?.message ?? "Erreur de chargement."}</p>}
        {!isLoading && !isError && (
          <Card>
            <CardHeader>
              <CardTitle>Liste (tri par nom)</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data || data.length === 0) ? (
                <div className="text-sm text-muted-foreground">Aucun aliment. Créez votre premier aliment.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">kcal/100g</TableHead>
                      <TableHead className="text-right">Prot</TableHead>
                      <TableHead className="text-right">Gluc</TableHead>
                      <TableHead className="text-right">Lip</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[1%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((a) => (
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
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Aliments;
