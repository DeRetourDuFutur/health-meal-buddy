import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Unlock, Trash2 } from "lucide-react";

export type CustomPathology = {
  id: string;
  label: string;
  code?: string | null;
  is_hidden?: boolean; // Optionnel pour correspondre au type UserCustomPathology
};

export type PathologiesCustomManagerProps = {
  customPathologies: CustomPathology[];
  showAdmin: boolean;
  selectedDefaultCodes: Set<string>;
  selectedDefaultLabels: Set<string>;
  sanitizeCode: (s: string) => string;
  defaultPathologies: Array<{ label: string; code?: string | null }>;
  onToggleHidden: (id: string, hidden: boolean) => Promise<void>;
  onPromoteToDefault: (id: string) => Promise<void>;
  onDeleteCustom: (id: string) => Promise<void>;
  onAddCustom: (payload: string | { label: string; code: string }) => Promise<void>;
  isTogglePending: boolean;
  isPromotePending: boolean;
  isDeletePending: boolean;
  isAddPending: boolean;
};

export function PathologiesCustomManager({
  customPathologies,
  showAdmin,
  selectedDefaultCodes,
  selectedDefaultLabels,
  sanitizeCode,
  defaultPathologies,
  onToggleHidden,
  onPromoteToDefault,
  onDeleteCustom,
  onAddCustom,
  isTogglePending,
  isPromotePending,
  isDeletePending,
  isAddPending,
}: PathologiesCustomManagerProps) {
  const { toast } = useToast();
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const [customCode, setCustomCode] = useState("");

  const handleAddCustom = async () => {
    const val = (customInputRef.current?.value || "").trim();
    if (!val) return;
    
    const codeUp = (showAdmin ? sanitizeCode(customCode.trim()) : "");
    const existsDefault = defaultPathologies.some((p) => 
      p.label.toLowerCase() === val.toLowerCase() || (!!codeUp && p.code?.toUpperCase() === codeUp)
    );
    
    if (existsDefault) {
      toast({ title: "Déjà existante", description: "Cette pathologie existe déjà dans les défauts.", variant: "destructive" });
      return;
    }
    
    try {
      const payload = showAdmin && customCode.trim() !== ""
        ? { label: val, code: sanitizeCode(customCode.trim()) }
        : val;
      await onAddCustom(payload);
      if (customInputRef.current) customInputRef.current.value = "";
      setCustomCode("");
      toast({ title: "Pathologie ajoutée" });
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "Ajout impossible";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    }
  };

  // Filtrer les pathologies qui ne sont pas déjà sélectionnées en défaut
  const filteredCustomPathologies = customPathologies.filter((c) => {
    const code = (c.code || "").toUpperCase();
    const lbl = (c.label || "").toLowerCase();
    const alsoSelectedAsDefault = (code && selectedDefaultCodes.has(code)) || (!code && selectedDefaultLabels.has(lbl));
    return !alsoSelectedAsDefault;
  });

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Personnelles</div>
      <div className="flex flex-col gap-2 rounded-md border border-emerald-800 bg-emerald-950/40 p-3">
        {filteredCustomPathologies.map((c) => (
          <label key={`c-${c.id}`} className={`flex items-center justify-between gap-3 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 ${(c.is_hidden ?? false) ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!(c.is_hidden ?? false)}
                onCheckedChange={async (v) => {
                  try {
                    const visible = v === true;
                    await onToggleHidden(c.id, !visible);
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
              <span className={`ml-2 text-xs ${(c.is_hidden ?? false) ? "text-emerald-300/60" : "text-emerald-300"}`}>
                {(c.is_hidden ?? false) ? "Inactif" : "Actif"}
              </span>
            </div>
            {showAdmin ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Rendre public"
                  className="h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-500 text-white justify-center"
                  disabled={isPromotePending}
                  onClick={async () => {
                    try {
                      await onPromoteToDefault(c.id);
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
                  disabled={isDeletePending}
                  onClick={async () => {
                    if (!window.confirm(`Supprimer la pathologie personnelle \"${c.label}\" ?`)) return;
                    try {
                      await onDeleteCustom(c.id);
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
            await handleAddCustom();
          }}
        />
        {showAdmin ? (
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
          disabled={isAddPending}
          onClick={handleAddCustom}
        >
          {isAddPending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
