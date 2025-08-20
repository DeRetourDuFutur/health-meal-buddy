import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Lock, Trash2 } from "lucide-react";

export type PathologiesDefaultListProps = {
  pathologies: Array<{ id: string; label: string; code?: string | null }>;
  selectedPathologies: Array<{ id?: string; pathology_id: string; pathology?: { label?: string; code?: string } | null }>;
  showAdmin: boolean;
  onAdd: (pathologyId: string) => Promise<void>;
  onRemove: (pathologyId: string) => Promise<void>;
  onDemoteToCustom: (pathologyId: string) => Promise<void>;
  onDeleteDefault: (pathologyId: string) => Promise<void>;
  isAddPending: boolean;
  isRemovePending: boolean;
  isDemotePending: boolean;
  isDeletePending: boolean;
};

export function PathologiesDefaultList({
  pathologies,
  selectedPathologies,
  showAdmin,
  onAdd,
  onRemove,
  onDemoteToCustom,
  onDeleteDefault,
  isAddPending,
  isRemovePending,
  isDemotePending,
  isDeletePending,
}: PathologiesDefaultListProps) {
  const { toast } = useToast();

  return (
    <div className="grid gap-2 max-h-64 overflow-auto border rounded-md p-3">
      {pathologies.map((p) => {
        const selected = selectedPathologies.some((up) => up.pathology_id === p.id);
        return (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-3">
              <Checkbox 
                checked={selected} 
                onCheckedChange={async (v) => {
                  try {
                    if (v === true) await onAdd(p.id);
                    else await onRemove(p.id);
                  } catch (e) {
                    const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Action impossible";
                    toast({ title: "Erreur", description: msg, variant: "destructive" });
                  }
                }} 
              />
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
                  disabled={isDemotePending || isRemovePending}
                  onClick={async () => {
                    try {
                      // Transfert défaut -> perso
                      await onDemoteToCustom(p.id);
                      // Retire la sélection défaut de l'utilisateur pour que la perso prenne le relais
                      await onRemove(p.id);
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
                  disabled={isDeletePending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer définitivement "${p.label}" des défauts ?`)) return;
                    try {
                      await onDeleteDefault(p.id);
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
  );
}
