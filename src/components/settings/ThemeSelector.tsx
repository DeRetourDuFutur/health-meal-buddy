import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { authToasts } from "@/lib/authToasts";

const themes = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Système" },
];

export default function ThemeSelector() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { user } = useAuth();
  const [value, setValue] = useState<string>(theme || "system");

  useEffect(() => {
    // Synchroniser l'affichage avec le thème courant
    setValue(theme || "system");
  }, [theme]);

  async function onChange(next: string) {
    setTheme(next);
    setValue(next);
    // Optionnel: si connecté, on synchronise en metadata, sans bloquer l'UI
    if (user) {
      const { error } = await supabase.auth.updateUser({ data: { theme: next } });
      if (error) authToasts.genericError(error.message);
    }
  }

  // Pour affichage, on peut mentionner la résolution système
  const resolved = theme === "system" ? systemTheme : theme;

  return (
    <div className="space-y-2">
      <Label>Thème</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un thème" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground">
        Thème effectif: <span className="font-medium">{resolved || "system"}</span>
      </div>
    </div>
  );
}
