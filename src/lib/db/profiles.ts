import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

// Types de base (alignés de manière souple avec le schéma 19.A)
export type Profile = {
  id: string; // = auth.users.id (alias de user_id si besoin)
  login: string | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null; // colonne GENERATED ALWAYS (si présente)
  avatar_url: string | null; // chemin dans le bucket private "avatars"
  // Besoins quotidiens
  needs_kcal: number | null;
  needs_protein_g: number | null;
  needs_carbs_g: number | null;
  needs_fat_g: number | null;
  needs_display_mode: "absolute" | "percentage" | null;
  // Confidentialité par champ (clé → privé?)
  privacy: Record<string, boolean> | null;
  is_disabled: boolean | null; // géré côté admin
  created_at: string | null;
  updated_at: string | null;
};

export const profileInputSchema = z.object({
  login: z.string().trim().min(3, "Min 3 caractères").max(50).optional(),
  first_name: z.string().trim().max(60).optional(),
  last_name: z.string().trim().max(60).optional(),
  age: z.number({ invalid_type_error: "Invalide" }).min(0).max(130).optional(),
  height_cm: z.number({ invalid_type_error: "Invalide" }).min(0).max(300).optional(),
  weight_kg: z.number({ invalid_type_error: "Invalide" }).min(0).max(500).optional(),
  needs_kcal: z.number({ invalid_type_error: "Invalide" }).min(0).max(20000).optional(),
  needs_protein_g: z.number({ invalid_type_error: "Invalide" }).min(0).max(1000).optional(),
  needs_carbs_g: z.number({ invalid_type_error: "Invalide" }).min(0).max(2000).optional(),
  needs_fat_g: z.number({ invalid_type_error: "Invalide" }).min(0).max(1000).optional(),
  needs_display_mode: z.enum(["absolute", "percentage"]).optional(),
  privacy: z.record(z.boolean()).optional(),
  avatar_url: z.string().optional(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

function mapPgErrorToMessage(code?: string, message?: string) {
  const raw = message ?? "";
  const m = raw.toLowerCase();
  const isDuplicate = code === "23505" || m.includes("duplicate key") || m.includes("conflict");
  if (isDuplicate) {
    // Message spécifique uniquement si le conflit concerne le login du profil
    if (m.includes("profile") && m.includes("login")) return "Login déjà utilisé.";
    return "Enregistrement déjà existant.";
  }
  if (code === "42501" || m.includes("permission") || m.includes("row-level security") || m.includes("rls")) return "Accès refusé.";
  // Cas Storage fréquents
  if (m.includes("bucket") && m.includes("not found")) return "Bucket 'avatars' introuvable. Exécutez le script SQL de création du bucket.";
  if (m.includes("resource already exists") || m.includes("already exists")) return "La ressource existe déjà.";
  if (m.includes("invalid") || m.includes("bad request")) return `Requête invalide: ${raw}`;
  if (m.includes("payload too large") || m.includes("too large")) return "Fichier trop volumineux.";
  if (m.includes("unsupported") || m.includes("content-type")) return `Type de fichier non supporté: ${raw}`;
  return raw || "Une erreur est survenue.";
}

// Helper module-scope: mappe dynamiquement n'importe quelle ligne vers notre Profile
function toProfile(row: Record<string, unknown> | null): Profile | null {
    if (!row) return null;
    const r = row as Record<string, unknown>;
    const pickId = () => {
      const v = "user_id" in r ? r["user_id"] : r["id"];
      return typeof v === "string" ? v : undefined;
    };
    const id = pickId();
    if (!id) return null;
    const pickStr = (k: string) => (k in r && typeof r[k] === "string" ? (r[k] as string) : null);
    const pickNum = (k: string) => (k in r && typeof r[k] === "number" ? (r[k] as number) : null);
    const pickBool = (k: string) => (k in r && typeof r[k] === "boolean" ? (r[k] as boolean) : null);
    const pickPrivacy = () => {
      const v = r["privacy"];
      if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, boolean>;
      return null;
    };
    const pickDisplayMode = () => {
      const v = r["needs_display_mode"];
      return v === "absolute" || v === "percentage" ? (v as "absolute" | "percentage") : null;
    };
    return {
      id,
      login: pickStr("login"),
      first_name: pickStr("first_name"),
      last_name: pickStr("last_name"),
      age: pickNum("age"),
      height_cm: pickNum("height_cm"),
      weight_kg: pickNum("weight_kg"),
      bmi: pickNum("bmi"),
      avatar_url: pickStr("avatar_url"),
      needs_kcal: pickNum("needs_kcal"),
      needs_protein_g: pickNum("needs_protein_g"),
      needs_carbs_g: pickNum("needs_carbs_g"),
      needs_fat_g: pickNum("needs_fat_g"),
      needs_display_mode: pickDisplayMode(),
      privacy: pickPrivacy(),
      is_disabled: pickBool("is_disabled"),
      created_at: pickStr("created_at"),
      updated_at: pickStr("updated_at"),
    };
}

// Colonne is_hidden garantie côté DB (décision 19.D)

export async function getMyProfile(): Promise<Profile | null> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const table = supabase.from("profiles");

  // 1) Essai par user_id avec select(*) — évite les 400 si des colonnes manquent
  let r = await table.select("*").eq("user_id", userId).maybeSingle();
  if (!r?.error) return toProfile(r.data as Record<string, unknown> | null);
  const e1 = r.error;
  const msg1 = (e1?.message || "").toLowerCase();

  // 2) Si user_id n'existe pas, essai par id
  if (msg1.includes("column") && msg1.includes("user_id") && msg1.includes("does not exist")) {
  r = await table.select("*").eq("id", userId).maybeSingle();
  if (!r?.error) return toProfile(r.data as Record<string, unknown> | null);
  const e2 = r.error as { code?: string; message?: string; details?: string; hint?: string } | null;
  throw new Error(`${mapPgErrorToMessage(e2?.code, e2?.message)} [profiles.select(id): ${e2?.message}${e2?.details ? ` | ${e2.details}` : ''}${e2?.hint ? ` | ${e2.hint}` : ''}]`);
  }

  // 3) Autre erreur: remonter message générique contextualisé
  throw new Error(`${mapPgErrorToMessage(e1?.code, e1?.message)} [profiles.select(user_id): ${e1?.message}${e1?.details ? ` | ${e1.details}` : ''}${e1?.hint ? ` | ${e1.hint}` : ''}]`);
}

export async function upsertMyProfile(input: ProfileInput): Promise<Profile> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");

  // Nettoyage: on ne pousse que les clés définies
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) base[k] = v;
  }

  const table = supabase.from("profiles");

  // 1) UPDATE ciblé (évite un INSERT si la ligne existe déjà et contourne NOT NULL)
  const updateOnce = async (key: "user_id" | "id", payload: Record<string, unknown>): Promise<Profile | null> => {
    if (Object.keys(payload).length === 0) return null; // rien à mettre à jour
  const res = await table.update(payload).eq(key, userId).select("*");
    // Nettoyage des colonnes inexistantes
    if (res?.error) {
      const err = res.error;
      const m = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(err?.message || "");
      if (m) {
        const bad = m[1];
        if (bad in payload) {
          const next = { ...payload } as Record<string, unknown>;
          delete (next as Record<string, unknown>)[bad];
          return await updateOnce(key, next);
        }
      }
      // Si clé d'identité absente, basculer sur l'autre clé
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes(key) && msg.includes("does not exist")) {
        const alt: "user_id" | "id" = key === "id" ? "user_id" : "id";
        return await updateOnce(alt, payload);
      }
    }
    const dataUnknown = res?.data as unknown;
  const row = (Array.isArray(dataUnknown) ? (dataUnknown as unknown[])[0] : null) as Record<string, unknown> | null;
  if (!row) return null;
  return toProfile(row);
  };

  let updated = await updateOnce("user_id", base);
  if (!updated) updated = await updateOnce("id", base);
  if (updated) return updated;

  // 2) INSERT avec login de secours si absent (évite NOT NULL)
  const makeFallbackLogin = () => {
    const email = session?.user.email ?? "";
    const local = (email.split("@")[0] || "user").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    return `${local || "user"}_${userId.slice(0, 8)}`;
  };

  const insertWithKey = async (key: "user_id" | "id") => {
    const payload: Record<string, unknown> = { ...base };
    payload[key] = userId;
    const loginVal = (payload as Record<string, unknown>)["login"];
    if (!("login" in payload) || loginVal == null || String(loginVal).trim() === "") {
      (payload as Record<string, unknown>)["login"] = makeFallbackLogin();
    }
  let res = await table.insert(payload).select("*").single();
    if (res?.error) {
      const err = res.error;
      const raw = err?.message || "";
  const m = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(raw);
      if (m) {
        const bad = m[1];
        const next = { ...payload } as Record<string, unknown>;
        delete (next as Record<string, unknown>)[bad];
        res = await table.insert(next).select("*").single();
        if (res?.error) throw new Error(mapPgErrorToMessage(res.error.code, res.error.message));
  } else if (/null value in column\s+"login"/i.test(raw)) {
        const next = { ...(payload as Record<string, unknown>), login: makeFallbackLogin() };
        res = await table.insert(next).select("*").single();
        if (res?.error) throw new Error(mapPgErrorToMessage(res.error.code, res.error.message));
      } else if (raw.toLowerCase().includes("does not exist") && raw.toLowerCase().includes(key)) {
        // bascule de clé
        const alt: "user_id" | "id" = key === "id" ? "user_id" : "id";
        return await insertWithKey(alt);
      } else if (res?.error) {
        throw new Error(mapPgErrorToMessage(res.error.code, res.error.message));
      }
    }
  const row = res.data as Record<string, unknown>;
  return toProfile(row)!;
  };

  return await insertWithKey("user_id");
}

export type Pathology = {
  id: string;
  code: string;
  label: string;
  created_at: string;
  updated_at: string;
};

export async function listPathologies(): Promise<Pathology[]> {
  const { data, error } = await supabase
    .from("pathologies")
    .select("*")
    .order("label", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return (data ?? []) as Pathology[];
}

export type UserPathology = {
  id: string;
  user_id: string;
  pathology_id: string;
  created_at: string;
  updated_at: string;
  pathology?: Pathology; // jointure optionnelle
};

export async function listMyPathologies(): Promise<UserPathology[]> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const { data, error } = await supabase
    .from("user_pathologies")
    .select("*, pathology:pathologies(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return (data ?? []) as UserPathology[];
}

export async function addMyPathology(pathology_id: string): Promise<UserPathology> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const { data, error } = await supabase
    .from("user_pathologies")
    .insert({ user_id: userId, pathology_id })
    .select("*, pathology:pathologies(*)")
    .single();
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  return data as UserPathology;
}

export async function removeMyPathology(pathology_id: string): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const { error } = await supabase
    .from("user_pathologies")
    .delete()
    .eq("user_id", userId)
    .eq("pathology_id", pathology_id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}

export type ProfileHistory = {
  id: string;
  user_id: string;
  changed_at?: string; // si présent
  created_at?: string; // fallback
  // autres colonnes d'audit selon votre fonction
};

export async function listMyProfileHistory(limit = 50): Promise<ProfileHistory[]> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  // On tente un order by changed_at, sinon le SGBD ignorera si la colonne n'existe pas (mais Supabase peut remonter une erreur).
  // Pour rester sûr, on s'en tient à l'ordre par created_at si disponible, sinon pas d'ordre strict.
  let query = supabase.from("profile_history").select("*").eq("user_id", userId).limit(limit);
  // Essai d'ordre standard; si l'API renvoie une erreur, elle sera mappée.
  query = query.order("changed_at", { ascending: false });
  const { data, error } = await query;
  if (error) {
    // Deuxième essai: order by created_at si changed_at n'existe pas
    const retry = await supabase
      .from("profile_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (retry.error) throw new Error(mapPgErrorToMessage(retry.error.code, retry.error.message));
    return (retry.data ?? []) as ProfileHistory[];
  }
  return (data ?? []) as ProfileHistory[];
}

// Avatar — upload dans bucket private "avatars", puis mise à jour du profil.avatar_url
export async function updateAvatar(file: File): Promise<string> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error: upErr } = await supabase.storage.from("avatars").upload(filePath, file, {
    upsert: true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });
  if (upErr) throw new Error(mapPgErrorToMessage(undefined, upErr.message));

  const table = supabase.from("profiles");
  // 1) UPDATE avatar_url si la ligne existe
  let upd = await table.update({ avatar_url: filePath }).eq("user_id", userId);
  if (upd?.error) {
    const msg = (upd.error.message || "").toLowerCase();
    if (msg.includes("column") && msg.includes("user_id") && msg.includes("does not exist")) {
      upd = await table.update({ avatar_url: filePath }).eq("id", userId);
      if (upd?.error) {
        const msg2 = (upd.error.message || "").toLowerCase();
        if (msg2.includes("column") && msg2.includes("avatar_url") && msg2.includes("does not exist")) {
          return filePath;
        }
        throw new Error(mapPgErrorToMessage(upd.error.code, upd.error.message));
      }
    } else if (msg.includes("column") && msg.includes("avatar_url") && msg.includes("does not exist")) {
      return filePath;
    } else {
      throw new Error(mapPgErrorToMessage(upd.error.code, upd.error.message));
    }
  }
  // Si aucune ligne touchée, faire un INSERT avec login de secours
  // Note: PostgREST ne fournit pas un count ici sans préférence; on tente un select rapide
  const check = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  const exists = !!check.data && !check.error;
  if (!exists) {
    const fallbackLogin = (session?.user.email?.split("@")[0] || "user").replace(/[^a-z0-9_-]/gi, "").toLowerCase() + `_${userId.slice(0, 8)}`;
  let ins = await table.insert({ user_id: userId, avatar_url: filePath, login: fallbackLogin });
    if (ins?.error) {
      const msg = (ins.error.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("user_id") && msg.includes("does not exist")) {
        ins = await table.insert({ id: userId, avatar_url: filePath, login: fallbackLogin });
        if (ins?.error) {
          const msg2 = (ins.error.message || "").toLowerCase();
          if (msg2.includes("column") && msg2.includes("avatar_url") && msg2.includes("does not exist")) {
            return filePath;
          }
          throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
        }
      } else if (msg.includes("column") && msg.includes("avatar_url") && msg.includes("does not exist")) {
        return filePath;
      } else if (ins?.error) {
        throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
      }
    }
  }
  return filePath;
}

export async function getAvatarSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Vérification de disponibilité du login (heuristique côté client)
export async function isLoginAvailable(login: string): Promise<boolean> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!login) return false;
  const candidate = login.trim();
  // On cherche un profil avec ce login (insensible à la casse via ILIKE exact)
  const table = supabase.from("profiles");
  // Priorité à user_id pour éviter 400 si id n'existe pas
  // Utilise un type souple car on réassigne la requête avec des sélections différentes (user_id vs id)
  let r: any = await table
    .select("user_id", { count: "exact" })
    .ilike("login", candidate)
    .neq("user_id", userId ?? "00000000-0000-0000-0000-000000000000");
  if (r?.error) {
    const e = r.error;
    const msg = (e?.message || "").toLowerCase();
    if (msg.includes("column") && msg.includes("user_id") && msg.includes("does not exist")) {
      r = await table.select("id", { count: "exact" }).ilike("login", candidate).neq("id", userId ?? "00000000-0000-0000-0000-000000000000");
    } else if (msg.includes("column") && msg.includes("login") && msg.includes("does not exist")) {
      // Pas de colonne login: on considère disponible pour ne pas bloquer l'utilisateur
      return true;
    }
  }
  if (r?.error) throw new Error(mapPgErrorToMessage(r.error.code, r.error.message));
  // Si au moins 1 autre id est trouvé, non disponible.
  const dataUnknown = r?.data as unknown;
  const arr = Array.isArray(dataUnknown) ? (dataUnknown as unknown[]) : [];
  return arr.length === 0;
}

// Pathologies custom par utilisateur
export type UserCustomPathology = {
  id: string;
  user_id: string;
  label: string;
  // Code optionnel (ex: T2D) pour homogénéiser avec les pathologies par défaut
  code?: string | null;
  // Visible/masquée: si la colonne n'existe pas côté DB, on retombe sur localStorage
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
};

export async function listMyCustomPathologies(): Promise<UserCustomPathology[]> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const { data, error } = await supabase
    .from("user_custom_pathologies")
    .select("id,user_id,label,code,is_hidden,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    user_id: String(r.user_id),
    label: String(r.label),
    code: typeof (r as any).code === "string" ? ((r as any).code as string) : null,
    is_hidden: !!(r as any).is_hidden,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));
}

export async function addMyCustomPathology(label: string, code?: string | null): Promise<UserCustomPathology> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const sanitized = label.trim();
  if (sanitized.length < 2) throw new Error("Libellé trop court.");
  // 1) Existence case-insensitive: si trouvée et inactive → réactiver, sinon retourner telle quelle
  const pre = await supabase
    .from("user_custom_pathologies")
    .select("id,is_hidden,label,code,created_at,updated_at")
    .eq("user_id", userId)
    .ilike("label", sanitized)
    .maybeSingle();
  if (pre?.error && pre.error.code !== "PGRST116") { // ignore not found
    throw new Error(mapPgErrorToMessage(pre.error.code, pre.error.message));
  }
  const existing = pre?.data as (Record<string, unknown> | null);
  if (existing && existing.id) {
    const hid = !!(existing as any).is_hidden;
    if (hid) {
      const upd = await supabase
        .from("user_custom_pathologies")
        .update({ is_hidden: false as any })
        .eq("user_id", userId)
        .eq("id", String(existing.id))
        .select("id,user_id,label,code,is_hidden,created_at,updated_at")
        .single();
      if (upd.error) throw new Error(mapPgErrorToMessage(upd.error.code, upd.error.message));
      const r = upd.data as Record<string, unknown>;
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        label: String(r.label),
        code: typeof (r as any).code === "string" ? ((r as any).code as string) : null,
        is_hidden: !!(r as any).is_hidden,
        created_at: String(r.created_at),
        updated_at: String(r.updated_at),
      };
    }
    // déjà active → renvoyer l'existante (idempotent)
    return {
      id: String(existing.id),
      user_id: String((existing as any).user_id),
      label: String((existing as any).label),
      code: typeof (existing as any).code === "string" ? ((existing as any).code as string) : null,
      is_hidden: !!(existing as any).is_hidden,
      created_at: String((existing as any).created_at),
      updated_at: String((existing as any).updated_at),
    };
  }
  // 2) Insertion (code optionnel)
  const payload = (code && code.trim() !== "")
    ? { user_id: userId, label: sanitized, code: code.trim() }
    : { user_id: userId, label: sanitized };
  const ins = await supabase
    .from("user_custom_pathologies")
    .insert(payload)
    .select("id,user_id,label,code,is_hidden,created_at,updated_at")
    .single();
  if (ins.error) throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
  const r = ins.data as Record<string, unknown>;
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    label: String(r.label),
    code: typeof (r as any).code === "string" ? ((r as any).code as string) : null,
    is_hidden: !!(r as any).is_hidden,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function removeMyCustomPathology(id: string): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const { error } = await supabase
    .from("user_custom_pathologies")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(mapPgErrorToMessage(error.code, error.message));
}

// Suppression d'une pathologie personnelle par admin (par id direct)
export async function adminDeleteCustomPathology(id: string): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.user?.id) throw new Error("Vous devez être connecté.");
  // Tenter avec 'returning' pour savoir si une ligne a été supprimée
  const del = await supabase.from("user_custom_pathologies").delete().eq("id", id).select("id");
  if (del.error) throw new Error(mapPgErrorToMessage(del.error.code, del.error.message));
  const affected = Array.isArray(del.data) ? del.data.length : 0;
  if (affected > 0) return;
  // Si aucune ligne affectée, vérifier si la ligne existe encore (RLS ou id invalide)
  const chk = await supabase.from("user_custom_pathologies").select("id").eq("id", id).maybeSingle();
  if (chk.error) throw new Error(mapPgErrorToMessage(chk.error.code, chk.error.message));
  if (chk.data) throw new Error("Suppression non autorisée (RLS/politiques).");
}

// Affiché/masquée pour pathologie personnelle
export async function setMyCustomPathologyHidden(id: string, hidden: boolean): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const table = supabase.from("user_custom_pathologies");
  const res = await table.update({ is_hidden: hidden as any }).eq("user_id", userId).eq("id", id);
  if (res?.error) throw new Error(mapPgErrorToMessage(res.error.code, res.error.message));
}

// Utilitaire: génère un code court à partir d'un libellé (ex: "Diabète Type 2" -> "DT2")
function makeCodeFromLabel(label: string): string {
  const cleaned = label
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  if (!cleaned) return "CU"; // 2 chars
  const words = cleaned.split(/\s+/).filter(Boolean);
  const firstLetter = (words[0]?.[0] || "").toUpperCase();
  const firstDigitMatch = cleaned.match(/\d/);
  const secondChar = firstDigitMatch ? firstDigitMatch[0] : ((words[1]?.[0] || "").toUpperCase() || (words[0]?.[1]?.toUpperCase() || "U"));
  return (firstLetter + secondChar).substring(0, 2);
}

// Promotion de pathologies personnelles en pathologies par défaut
export async function promoteCustomPathologies(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.user?.id) throw new Error("Vous devez être connecté.");
  const role = (session.user.user_metadata as any)?.role;
  // Probe: la table pathologies a-t-elle une colonne 'code' ? (évite 400 sur onConflict)
  let PATHO_HAS_CODE_COL = false;
  try {
    const probe = await supabase.from("pathologies").select("*").limit(1);
    const any = (probe.data ?? []) as Array<Record<string, unknown>>;
    PATHO_HAS_CODE_COL = any.some((r) => Object.prototype.hasOwnProperty.call(r, "code"));
  } catch {}
  // 1) Récupère les entrées custom ciblées
  // Essai avec colonne code; fallback sans code si colonne absente
  let selRes: any = await supabase
    .from("user_custom_pathologies")
    .select("id, label, code")
    .in("id", ids);
  if (selRes?.error) {
    const raw = (selRes.error.message || "").toLowerCase();
    const missing = raw.includes("code") && (raw.includes("does not exist") || raw.includes("could not find") || raw.includes("schema cache") || raw.includes("unknown column"));
    if (missing) {
      selRes = await supabase
        .from("user_custom_pathologies")
        .select("id, label")
        .in("id", ids);
    }
  }
  if (selRes?.error) throw new Error(mapPgErrorToMessage(selRes.error.code, selRes.error.message));
  const items = ((selRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    label: String(r.label),
    code: typeof (r as any).code === "string" ? ((r as any).code as string) : null,
  }));
  if (items.length === 0) return;
  // 2) Prépare les lignes à insérer dans pathologies (code unique supposé)
  const rows = items.map((it) => ({
    code: (it.code && it.code.trim()) ? it.code.trim().toUpperCase() : makeCodeFromLabel(it.label),
    label: it.label,
  }));
  // 2bis) Si admin, préférer la RPC directement pour éviter un 403 préalable visible dans la console
  if (role === "admin") {
    const rpc = await supabase.rpc("promote_custom_pathologies", { items: rows as any });
    if (!rpc.error) return;
    // si la RPC n'existe pas / pas de droits, on continue avec les fallbacks ci-dessous
  }
  // 3) Upsert dans pathologies
  if (PATHO_HAS_CODE_COL) {
    const ins = await supabase.from("pathologies").upsert(rows, { onConflict: "code" });
    if (!ins.error) return;
    const raw = ins.error.message || "";
    const msg = raw.toLowerCase();
    const isPerm = ins.error.code === "42501" || msg.includes("permission") || msg.includes("row-level security") || msg.includes("rls") || msg.includes("forbidden");
    const badConflict = msg.includes("on conflict") && (msg.includes("no unique") || msg.includes("invalid") || msg.includes("constraint"));
    if (isPerm) {
      // Fallback: RPC admin si disponible
      const rpc = await supabase.rpc("promote_custom_pathologies", { items: rows as any });
      if (rpc.error) throw new Error(mapPgErrorToMessage(rpc.error.code, rpc.error.message));
      return;
    }
    // Fallback: pas d'unicité sur code → upsert manuel par libellé
    if (!isPerm && badConflict) {
      // Sélectionne les libellés existants
      const labels = Array.from(new Set(rows.map((r) => r.label)));
      const existing = await supabase.from("pathologies").select("id,label").in("label", labels);
      if (existing.error) throw new Error(mapPgErrorToMessage(existing.error.code, existing.error.message));
      const existSet = new Set(((existing.data ?? []) as Array<{ label: string }>).map((e) => e.label));
      const toInsert = rows.filter((r) => !existSet.has(r.label)).map((r) => ({ code: r.code, label: r.label }));
      if (toInsert.length > 0) {
        const ins2 = await supabase.from("pathologies").insert(toInsert);
        if (ins2.error) throw new Error(mapPgErrorToMessage(ins2.error.code, ins2.error.message));
      }
      return;
    }
    // Autre erreur
    throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
  } else {
    // Pas de colonne code → upsert manuel par libellé
    const labels = Array.from(new Set(rows.map((r) => r.label)));
    const existing = await supabase.from("pathologies").select("id,label").in("label", labels);
    if (existing.error) {
      const raw = existing.error.message || "";
      const msg = raw.toLowerCase();
      const isPerm = existing.error.code === "42501" || msg.includes("permission") || msg.includes("row-level security") || msg.includes("rls") || msg.includes("forbidden");
      if (isPerm) {
        const rpc = await supabase.rpc("promote_custom_pathologies", { items: rows as any });
        if (rpc.error) throw new Error(mapPgErrorToMessage(rpc.error.code, rpc.error.message));
        return;
      }
      throw new Error(mapPgErrorToMessage(existing.error.code, existing.error.message));
    }
    const existSet = new Set(((existing.data ?? []) as Array<{ label: string }>).map((e) => e.label));
    const toInsert = rows.filter((r) => !existSet.has(r.label)).map((r) => ({ label: r.label }));
    if (toInsert.length > 0) {
      const ins = await supabase.from("pathologies").insert(toInsert);
      if (ins.error) throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
    }
    return;
  }
}

// Transférer une pathologie défaut (pathologies) vers une pathologie personnelle (user_custom_pathologies)
export async function demoteDefaultPathologyToCustom(pathologyId: string): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  // 1) Lire la pathologie par défaut
  const sel = await supabase.from("pathologies").select("id, code, label").eq("id", pathologyId).maybeSingle();
  if (sel.error) throw new Error(mapPgErrorToMessage(sel.error.code, sel.error.message));
  const row = sel.data as { id: string; code?: string | null; label: string } | null;
  if (!row) throw new Error("Introuvable");
  // 2) Si elle existe déjà côté perso, ne rien faire (évite 409)
  const pre = await supabase
    .from("user_custom_pathologies")
    .select("id")
    .eq("user_id", userId)
    .eq("label", row.label)
    .maybeSingle();
  if (pre?.data) return; // déjà transférée
  // 3) Créer une entrée perso équivalente sans utiliser 'code' (évite 400 si colonne absente)
  const ins = await supabase
    .from("user_custom_pathologies")
    .insert({ user_id: userId, label: row.label })
    .select("id")
    .single();
  if (ins?.error) {
    const raw = (ins.error.message || "").toLowerCase();
    const isDuplicate = ins.error.code === "23505" || raw.includes("duplicate key") || raw.includes("conflict");
    if (isDuplicate) return; // idempotent si course condition
    throw new Error(mapPgErrorToMessage(ins.error.code, ins.error.message));
  }
}

// Suppression d'une pathologie par défaut (admin requis via RLS ou RPC)
export async function deleteDefaultPathology(pathologyId: string): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.user?.id) throw new Error("Vous devez être connecté.");
  // Tentative directe (si RLS autorise l'admin) avec 'returning'
  let del = await supabase.from("pathologies").delete().eq("id", pathologyId).select("id");
  if (del.error) {
    const raw = del.error.message || "";
    const msg = raw.toLowerCase();
    const isPerm = del.error.code === "42501" || msg.includes("permission") || msg.includes("row-level security") || msg.includes("rls") || msg.includes("forbidden");
    if (!isPerm) throw new Error(mapPgErrorToMessage(del.error.code, del.error.message));
  }
  const affected = Array.isArray(del.data) ? del.data.length : 0;
  if (affected > 0) return;
  // Si aucune ligne affectée (souvent RLS silencieuse), fallback RPC
  const rpc = await supabase.rpc("delete_pathology", { pid: pathologyId });
  if (rpc.error) throw new Error(mapPgErrorToMessage(rpc.error.code, rpc.error.message));
  // Vérifier que la ligne n'existe plus
  const chk = await supabase.from("pathologies").select("id").eq("id", pathologyId).maybeSingle();
  if (!chk.error && chk.data) throw new Error("Suppression non appliquée (politiques/contraintes).");
}

// Suppression avatar: supprime le fichier storage (si fourni) puis met avatar_url à null
export async function deleteAvatar(currentPath?: string | null): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");

  if (currentPath) {
    const { error: delErr } = await supabase.storage.from("avatars").remove([currentPath]);
    if (delErr) {
      const msg = (delErr.message || "").toLowerCase();
      const ignorable = msg.includes("not found") || msg.includes("no such file");
      if (!ignorable) throw new Error(mapPgErrorToMessage(undefined, delErr.message));
    }
  }

  const table = supabase.from("profiles");
  let upd = await table.update({ avatar_url: null }).eq("user_id", userId);
  if (upd?.error) {
    const m = (upd.error.message || "").toLowerCase();
    if (m.includes("column") && m.includes("user_id") && m.includes("does not exist")) {
      upd = await table.update({ avatar_url: null }).eq("id", userId);
      if (upd?.error) {
        const m2 = (upd.error.message || "").toLowerCase();
        if (m2.includes("column") && m2.includes("avatar_url") && m2.includes("does not exist")) {
          return;
        }
        throw new Error(mapPgErrorToMessage(upd.error.code, upd.error.message));
      }
    } else if (m.includes("column") && m.includes("avatar_url") && m.includes("does not exist")) {
      return;
    } else {
      throw new Error(mapPgErrorToMessage(upd.error.code, upd.error.message));
    }
  }
}

// Helpers BMI côté data
export function computeBmi(height_cm?: number | null, weight_kg?: number | null) {
  if (!height_cm || !weight_kg || height_cm <= 0) return null;
  const h = height_cm / 100;
  return +(weight_kg / (h * h)).toFixed(1);
}

export function bmiLabel(bmi: number | null) {
  if (bmi == null) return "—";
  if (bmi < 18.5) return `${bmi} (maigreur)`;
  if (bmi < 25) return `${bmi} (normal)`;
  if (bmi < 30) return `${bmi} (surpoids)`;
  return `${bmi} (obésité)`;
}
