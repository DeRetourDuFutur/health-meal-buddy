import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import type { Aliment } from "@/lib/db/aliments";

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeItem = {
  id: string;
  recipe_id: string;
  aliment_id: string;
  quantity_g: number;
  created_at: string;
  updated_at: string;
  aliment?: Aliment; // joined when selecting
};

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis"),
  servings: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(1, "Doit être ≥ 1"),
  notes: z.string().optional().or(z.literal("")),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

export const recipeItemSchema = z.object({
  aliment_id: z.string().uuid("Aliment invalide"),
  quantity_g: z
    .number({ invalid_type_error: "Valeur invalide" })
    .min(0, "Doit être ≥ 0"),
});

export type RecipeItemInput = z.infer<typeof recipeItemSchema>;

function mapPgErrorToMessage(code?: string, message?: string) {
  const m = (message ?? "").toLowerCase();
  if (code === "23505" || m.includes("duplicate key")) {
    return "Doublon détecté.";
  }
  if (code === "23503" || m.includes("foreign key")) {
    return "Référence invalide (recette ou aliment).";
  }
  return "Une erreur est survenue.";
}

export type RecipeWithItems = Recipe & { items: RecipeItem[] };

export async function listRecipes(): Promise<RecipeWithItems[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, items:recipe_items(*, aliment:aliments(*))"
    )
    .order("name", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  // Ensure items is always an array
  return (data ?? []).map((r: any) => ({ ...r, items: r.items ?? [] })) as RecipeWithItems[];
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const payload = {
    user_id: userId,
    name: input.name,
    servings: input.servings,
    notes: input.notes && input.notes.length > 0 ? input.notes : null,
  };
  const { data, error } = await supabase
    .from("recipes")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as Recipe;
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .update({
      name: input.name,
      servings: input.servings,
      notes: input.notes && input.notes.length > 0 ? input.notes : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as Recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}

export async function addRecipeItem(recipe_id: string, input: RecipeItemInput): Promise<RecipeItem> {
  const payload = { recipe_id, aliment_id: input.aliment_id, quantity_g: input.quantity_g };
  const { data, error } = await supabase
    .from("recipe_items")
    .insert(payload)
    .select("*, aliment:aliments(*)")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as RecipeItem;
}

export async function updateRecipeItem(id: string, input: Pick<RecipeItemInput, "quantity_g">): Promise<RecipeItem> {
  const { data, error } = await supabase
    .from("recipe_items")
    .update({ quantity_g: input.quantity_g })
    .eq("id", id)
    .select("*, aliment:aliments(*)")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as RecipeItem;
}

export async function deleteRecipeItem(id: string): Promise<void> {
  const { error } = await supabase.from("recipe_items").delete().eq("id", id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}

export type RecipeTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  perServing: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

export function computeRecipeTotals(items: Array<{ quantity_g: number; aliment?: Aliment }>, servings: number): RecipeTotals {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const it of items) {
    if (!it.aliment) continue;
    const factor = (it.quantity_g || 0) / 100;
    kcal += factor * (Number(it.aliment.kcal_per_100g) || 0);
    protein += factor * (Number(it.aliment.protein_g_per_100g) || 0);
    carbs += factor * (Number(it.aliment.carbs_g_per_100g) || 0);
    fat += factor * (Number(it.aliment.fat_g_per_100g) || 0);
  }
  const s = servings > 0 ? servings : 1;
  return {
    kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    perServing: {
      kcal: kcal / s,
      protein_g: protein / s,
      carbs_g: carbs / s,
      fat_g: fat / s,
    },
  };
}
