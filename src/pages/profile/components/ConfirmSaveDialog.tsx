import React from "react";
import { Button } from "@/components/ui/button";
import { AccessibleDialog } from "@/components/ui/AccessibleDialog";
import { DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { ProfileInput } from "@/lib/db/profiles";

export type ConfirmSaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: Partial<ProfileInput>;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
};

export function ConfirmSaveDialog({
  open,
  onOpenChange,
  changes,
  onConfirm,
  isLoading,
}: ConfirmSaveDialogProps) {
  const fieldLabels: Record<string, string> = {
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

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <AccessibleDialog
      open={open}
      onOpenChange={onOpenChange}
      idBase="profile-confirm"
      title="Confirmer les modifications"
      description="Vérifiez les changements avant d'enregistrer"
      body={
        <>
          <DialogTitle className="sr-only">Confirmer les modifications</DialogTitle>
          <div className="space-y-2 text-sm">
            {!hasChanges ? (
              <div>Aucune modification détectée.</div>
            ) : (
              <ul className="list-disc pl-5">
                {Object.entries(changes).map(([key, value]) => {
                  const label = fieldLabels[key] || key;
                  const displayValue = key === "privacy" ? "(modifié)" : String(value);
                  return (
                    <li key={key}>
                      <span className="font-medium">{label}</span>: {displayValue}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      }
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Enregistrement…" : "Confirmer"}
          </Button>
        </DialogFooter>
      }
    />
  );
}
