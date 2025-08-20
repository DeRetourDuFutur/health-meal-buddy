import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PathologiesDefaultList } from "./PathologiesDefaultList";
import { PathologiesCustomManager, type CustomPathology } from "./PathologiesCustomManager";

export type PathologiesSectionProps = {
  // Données des pathologies
  defaultPathologies: Array<{ id: string; label: string; code?: string | null }>;
  selectedPathologies: Array<{ id?: string; pathology_id: string; pathology?: { label?: string; code?: string } | null }>;
  customPathologies: CustomPathology[];
  
  // Configuration
  showAdmin: boolean;
  sanitizeCode: (s: string) => string;
  
  // Actions pathologies par défaut
  onAddDefault: (pathologyId: string) => Promise<void>;
  onRemoveDefault: (pathologyId: string) => Promise<void>;
  onDemoteToCustom: (pathologyId: string) => Promise<void>;
  onDeleteDefault: (pathologyId: string) => Promise<void>;
  
  // Actions pathologies personnalisées
  onToggleCustomHidden: (id: string, hidden: boolean) => Promise<void>;
  onPromoteToDefault: (id: string) => Promise<void>;
  onDeleteCustom: (id: string) => Promise<void>;
  onAddCustom: (payload: string | { label: string; code: string }) => Promise<void>;
  
  // États de chargement
  loadingStates: {
    addDefault: boolean;
    removeDefault: boolean;
    demoteDefault: boolean;
    deleteDefault: boolean;
    toggleCustom: boolean;
    promoteCustom: boolean;
    deleteCustom: boolean;
    addCustom: boolean;
  };
};

export function PathologiesSection({
  defaultPathologies,
  selectedPathologies,
  customPathologies,
  showAdmin,
  sanitizeCode,
  onAddDefault,
  onRemoveDefault,
  onDemoteToCustom,
  onDeleteDefault,
  onToggleCustomHidden,
  onPromoteToDefault,
  onDeleteCustom,
  onAddCustom,
  loadingStates,
}: PathologiesSectionProps) {
  // Sets pour détection des pathos "défaut" SÉLECTIONNÉS par l'utilisateur
  const selectedDefaultCodes = useMemo(() => new Set(
    selectedPathologies
      .map((up) => (up.pathology?.code || "").toUpperCase())
      .filter(Boolean)
  ), [selectedPathologies]);

  const selectedDefaultLabels = useMemo(() => new Set(
    selectedPathologies
      .map((up) => (up.pathology?.label || "").toLowerCase())
      .filter(Boolean)
  ), [selectedPathologies]);

  // Pathologies personnelles filtrées pour l'affichage des badges
  const visibleCustomPathologies = customPathologies
    .filter((c) => !(c.is_hidden ?? false))
    .filter((c) => {
      const code = (c.code || "").toUpperCase();
      const lbl = (c.label || "").toLowerCase();
      const alsoSelectedAsDefault = (code && selectedDefaultCodes.has(code)) || (!code && selectedDefaultLabels.has(lbl));
      return !alsoSelectedAsDefault; // cache si déjà SÉLECTIONNÉE en défaut
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pathologies</CardTitle>
        <CardDescription>Sélection multiple. Vous pouvez cocher/décocher pour ajouter/retirer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badges des pathologies sélectionnées */}
        <div className="flex flex-wrap gap-2">
          {selectedPathologies.map((up, idx) => (
            <Badge key={`up-${up.id ?? up.pathology_id ?? idx}`} variant="secondary">
              {up.pathology?.label ?? up.pathology_id}
            </Badge>
          ))}
          {visibleCustomPathologies.map((c, idx) => (
            <Badge
              key={`c-${c.id ?? c.label ?? idx}`}
              className="bg-emerald-900/60 text-emerald-50 hover:bg-emerald-900"
            >
              {c.label}
            </Badge>
          ))}
        </div>

        {/* Liste des pathologies par défaut */}
        <PathologiesDefaultList
          pathologies={defaultPathologies}
          selectedPathologies={selectedPathologies}
          showAdmin={showAdmin}
          onAdd={onAddDefault}
          onRemove={onRemoveDefault}
          onDemoteToCustom={onDemoteToCustom}
          onDeleteDefault={onDeleteDefault}
          isAddPending={loadingStates.addDefault}
          isRemovePending={loadingStates.removeDefault}
          isDemotePending={loadingStates.demoteDefault}
          isDeletePending={loadingStates.deleteDefault}
        />

        {/* Gestionnaire des pathologies personnalisées */}
        <PathologiesCustomManager
          customPathologies={customPathologies}
          showAdmin={showAdmin}
          selectedDefaultCodes={selectedDefaultCodes}
          selectedDefaultLabels={selectedDefaultLabels}
          sanitizeCode={sanitizeCode}
          defaultPathologies={defaultPathologies}
          onToggleHidden={onToggleCustomHidden}
          onPromoteToDefault={onPromoteToDefault}
          onDeleteCustom={onDeleteCustom}
          onAddCustom={onAddCustom}
          isTogglePending={loadingStates.toggleCustom}
          isPromotePending={loadingStates.promoteCustom}
          isDeletePending={loadingStates.deleteCustom}
          isAddPending={loadingStates.addCustom}
        />
      </CardContent>
    </Card>
  );
}
