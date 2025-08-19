import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

export type Aliment = {
  id: string;
  user_id: string;
  name: string;
  category?: string; // ajouté côté DB (catalogue commun) — optionnel pour compat ascendant
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

// === Étape 17 — Recherche / Filtres / Tri / Pagination ===
export type AlimentsSortBy = "name" | "kcal" | "prot" | "carb" | "fat";
export type AlimentsSort = { by: AlimentsSortBy; dir: "asc" | "desc" }[];
export type AlimentsFilters = {
  kcalMin?: number; kcalMax?: number;
  protMin?: number; protMax?: number;
  carbMin?: number; carbMax?: number;
  fatMin?: number;  fatMax?: number;
};
export type AlimentsQueryParams = {
  q?: string;
  category?: string; // 'All' ou nom de catégorie
  filters?: AlimentsFilters;
  sort?: AlimentsSort; // on n'applique que le premier élément
  page?: number; // défaut 1
  pageSize?: number; // défaut 10
};

export type AlimentsPagedResult = {
  items: Aliment[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function mapColumn(by: AlimentsSortBy): keyof Aliment {
  switch (by) {
    case "kcal": return "kcal_per_100g";
    case "prot": return "protein_g_per_100g";
    case "carb": return "carbs_g_per_100g";
    case "fat":  return "fat_g_per_100g";
    default:      return "name";
  }
}

function applyRange(
  qb: any,
  column: keyof Aliment,
  min?: number,
  max?: number
) {
  if (min !== undefined && max !== undefined && min > max) {
    // Incohérent -> ignorer la contrainte
    return qb;
  }
  if (min !== undefined) qb = qb.gte(column as string, min);
  if (max !== undefined) qb = qb.lte(column as string, max);
  return qb;
}

export async function listAlimentsPaged(params: AlimentsQueryParams = {}): Promise<AlimentsPagedResult> {
  const q = params.q?.trim() ?? "";
  const category = params.category && params.category.trim() ? params.category.trim() : undefined;
  const filters = params.filters ?? {};
  const sort = (params.sort && params.sort.length > 0)
    ? params.sort[0]
    : { by: "name" as AlimentsSortBy, dir: "asc" as const };
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
  const pageRaw = params.page && params.page > 0 ? params.page : 1;

  let qb = supabase
    .from("aliments")
    .select("*", { count: "exact" });

  if (category && category.toLowerCase() !== "all") {
    qb = qb.eq("category", category);
  }

  if (q) {
    qb = qb.ilike("name", `%${q}%`);
  }

  qb = applyRange(qb, "kcal_per_100g", filters.kcalMin, filters.kcalMax);
  qb = applyRange(qb, "protein_g_per_100g", filters.protMin, filters.protMax);
  qb = applyRange(qb, "carbs_g_per_100g", filters.carbMin, filters.carbMax);
  qb = applyRange(qb, "fat_g_per_100g", filters.fatMin, filters.fatMax);

  const sortCol = mapColumn(sort.by);
  qb = qb.order(sortCol as string, { ascending: sort.dir === "asc" });

  const offset = (pageRaw - 1) * pageSize;
  qb = qb.range(offset, offset + pageSize - 1);

  const { data, count, error } = await qb;
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize || 1));
  const page = Math.min(Math.max(1, pageRaw), pageCount);

  return {
    items: (data ?? []) as Aliment[],
    total,
    page,
    pageSize,
    pageCount,
  };
}

// Retourne les catégories distinctes (triées)
export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("aliments")
    .select("category")
    .not("category", "is", null)
    .order("category", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  const rows = (data ?? []) as { category?: string | null }[];
  const set = new Set<string>();
  for (const r of rows) {
    const c = (r.category ?? "").trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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
  // Étape 1: update sans demander la représentation pour éviter les erreurs 406
  const { error: updError } = await supabase
    .from("aliments")
    .update({
      name: input.name,
      kcal_per_100g: input.kcal_per_100g,
      protein_g_per_100g: input.protein_g_per_100g,
      carbs_g_per_100g: input.carbs_g_per_100g,
      fat_g_per_100g: input.fat_g_per_100g,
      notes: input.notes && input.notes.length > 0 ? input.notes : null,
    })
    .eq("id", id);
  if (updError) throw new Error(mapPgErrorToMessage(updError.code, updError.message));

  // Étape 2: relire la ligne mise à jour
  const { data, error: selError } = await supabase
    .from("aliments")
    .select("*")
    .eq("id", id)
    .single();
  if (selError) throw new Error(mapPgErrorToMessage(selError.code, selError.message));
  return data as Aliment;
}

export async function deleteAliment(id: string): Promise<void> {
  const { error } = await supabase.from("aliments").delete().eq("id", id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}
