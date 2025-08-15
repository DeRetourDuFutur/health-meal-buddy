import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

export type Aliment = {
  id: string;
  user_id: string;
  name: string;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const alimentSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  kcal_per_100g: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(0, "Doit être ≥ 0"),
  protein_g_per_100g: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(0, "Doit être ≥ 0"),
  carbs_g_per_100g: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(0, "Doit être ≥ 0"),
  fat_g_per_100g: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(0, "Doit être ≥ 0"),
  notes: z.string().optional().or(z.literal("")),
});

export type AlimentInput = z.infer<typeof alimentSchema>;

function mapPgErrorToMessage(code?: string, message?: string) {
  if (code === "23505" || (message && message.toLowerCase().includes("duplicate key"))) {
    return "Un aliment avec ce nom existe déjà.";
  }
  return "Une erreur est survenue.";
}

export async function listAliments(): Promise<Aliment[]> {
  const { data, error } = await supabase
    .from("aliments")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as Aliment[];
}

export async function createAliment(input: AlimentInput): Promise<Aliment> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const payload = {
    user_id: userId,
    name: input.name,
    kcal_per_100g: input.kcal_per_100g,
    protein_g_per_100g: input.protein_g_per_100g,
    carbs_g_per_100g: input.carbs_g_per_100g,
    fat_g_per_100g: input.fat_g_per_100g,
    notes: input.notes && input.notes.length > 0 ? input.notes : null,
  };
  const { data, error } = await supabase
    .from("aliments")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as Aliment;
}

export async function updateAliment(id: string, input: AlimentInput): Promise<Aliment> {
  const { data, error } = await supabase
    .from("aliments")
    .update({
      name: input.name,
      kcal_per_100g: input.kcal_per_100g,
      protein_g_per_100g: input.protein_g_per_100g,
      carbs_g_per_100g: input.carbs_g_per_100g,
      fat_g_per_100g: input.fat_g_per_100g,
      notes: input.notes && input.notes.length > 0 ? input.notes : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as Aliment;
}

export async function deleteAliment(id: string): Promise<void> {
  const { error } = await supabase.from("aliments").delete().eq("id", id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}
