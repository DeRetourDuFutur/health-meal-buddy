import { supabase } from "@/lib/supabaseClient";

export type FoodPreference = "like" | "dislike" | "allergy";

export type FoodPrefsMap = Record<string, FoodPreference>;

// Récupère les préférences de l'utilisateur courant sous forme de map { aliment_id: preference }
export async function getMyFoodPreferences(): Promise<FoodPrefsMap> {
  // Schéma confirmé: food_id (uuid), preference (text), user_id (uuid)
  const { data, error } = await supabase
    .from("user_food_preferences")
    .select("food_id, preference");
  if (error) throw new Error(error.message ?? "Une erreur est survenue.");
  const map: FoodPrefsMap = {};
  for (const row of (data ?? []) as Array<{ food_id?: string; preference?: string }>) {
    const alimentId = row.food_id;
    const pref = row.preference as FoodPreference | undefined;
    if (alimentId && pref) map[alimentId] = pref;
  }
  return map;
}

// Définit/écrase la préférence via RPC (note optionnelle -> null par défaut)
export async function setMyFoodPreference(
  alimentId: string,
  pref: FoodPreference
): Promise<void> {
  // Récupérer l’utilisateur pour renseigner user_id
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message ?? "Utilisateur inconnu.");
  const user = userRes?.user;
  if (!user) throw new Error("Utilisateur non connecté.");

  const payload = { food_id: alimentId, user_id: user.id, preference: pref } as const;
  // Tentative UPSERT; si pas de contrainte ON CONFLICT, fallback delete+insert
  const up = await supabase
    .from("user_food_preferences")
    .upsert(payload, { onConflict: "user_id,food_id" });
  if (!up.error) return;

  const msg = (up.error.message ?? "").toLowerCase();
  const isConflictConfig =
    msg.includes("no unique or exclusion constraint") || msg.includes("on conflict");
  if (!isConflictConfig) throw new Error(up.error.message ?? "Impossible d'enregistrer la préférence.");

  // Fallback: delete + insert (scopé à l’utilisateur)
  await supabase
    .from("user_food_preferences")
    .delete()
    .eq("user_id", user.id)
    .eq("food_id", alimentId);
  const ins = await supabase.from("user_food_preferences").insert(payload);
  if (ins.error) throw new Error(ins.error.message ?? "Impossible d'enregistrer la préférence.");
}

// Supprime la préférence pour revenir à aucun état
export async function removeMyFoodPreference(alimentId: string): Promise<void> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message ?? "Utilisateur inconnu.");
  const user = userRes?.user;
  if (!user) throw new Error("Utilisateur non connecté.");

  const { error } = await supabase
    .from("user_food_preferences")
    .delete()
    .eq("user_id", user.id)
    .eq("food_id", alimentId);
  if (error) throw new Error(error.message ?? "Impossible de supprimer la préférence.");
}
