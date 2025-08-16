import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

// Types de base (alignés de manière souple avec le schéma 19.A)
export type Profile = {
  id: string; // = auth.users.id (alias de user_id si besoin)
  login: string | null;
  full_name: string | null;
  birthdate: string | null; // ISO date (YYYY-MM-DD)
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null; // colonne GENERATED ALWAYS (peut ne pas exister)
  avatar_url: string | null; // chemin dans le bucket private "avatars" (peut ne pas exister)
  is_private: boolean | null;
  is_disabled: boolean | null; // géré côté admin
  created_at: string | null;
  updated_at: string | null;
};

export const profileInputSchema = z.object({
  login: z.string().trim().min(3, "Min 3 caractères").max(50).optional(),
  full_name: z.string().trim().max(120).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  height_cm: z.number({ invalid_type_error: "Invalide" }).min(0).max(300).optional(),
  weight_kg: z.number({ invalid_type_error: "Invalide" }).min(0).max(500).optional(),
  is_private: z.boolean().optional(),
  avatar_url: z.string().optional(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

function mapPgErrorToMessage(code?: string, message?: string) {
  const raw = message ?? "";
  const m = raw.toLowerCase();
  if (code === "23505" || m.includes("duplicate key")) return "Login déjà utilisé.";
  if (code === "42501" || m.includes("permission")) return "Accès refusé.";
  // Cas Storage fréquents
  if (m.includes("bucket") && m.includes("not found")) return "Bucket 'avatars' introuvable. Exécutez le script SQL de création du bucket.";
  if (m.includes("resource already exists") || m.includes("already exists")) return "La ressource existe déjà.";
  if (m.includes("invalid") || m.includes("bad request")) return `Requête invalide: ${raw}`;
  if (m.includes("payload too large") || m.includes("too large")) return "Fichier trop volumineux.";
  if (m.includes("unsupported") || m.includes("content-type")) return `Type de fichier non supporté: ${raw}`;
  return raw || "Une erreur est survenue.";
}

export async function getMyProfile(): Promise<Profile | null> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");
  const table = supabase.from("profiles");

  // Helper: mappe dynamiquement n'importe quelle ligne vers notre Profile
  const toProfile = (row: any | null): Profile | null => {
    if (!row) return null;
    const id = (row.user_id ?? row.id) as string | undefined;
    if (!id) return null;
    return {
      id,
      login: ("login" in row ? row.login : null) ?? null,
      full_name: ("full_name" in row ? row.full_name : null) ?? null,
      birthdate: ("birthdate" in row ? row.birthdate : null) ?? null,
      height_cm: ("height_cm" in row ? row.height_cm : null) ?? null,
      weight_kg: ("weight_kg" in row ? row.weight_kg : null) ?? null,
      bmi: ("bmi" in row ? row.bmi : null) ?? null,
      avatar_url: ("avatar_url" in row ? row.avatar_url : null) ?? null,
      is_private: ("is_private" in row ? row.is_private : null) ?? null,
      is_disabled: ("is_disabled" in row ? row.is_disabled : null) ?? null,
      created_at: ("created_at" in row ? row.created_at : null) ?? null,
      updated_at: ("updated_at" in row ? row.updated_at : null) ?? null,
    };
  };

  // 1) Essai par user_id avec select(*) — évite les 400 si des colonnes manquent
  let r: any = await table.select("*").eq("user_id", userId).maybeSingle();
  if (!r?.error) return toProfile(r.data);
  const e1: any = r.error;
  const msg1 = (e1?.message || "").toLowerCase();

  // 2) Si user_id n'existe pas, essai par id
  if (msg1.includes("column") && msg1.includes("user_id") && msg1.includes("does not exist")) {
    r = await table.select("*").eq("id", userId).maybeSingle();
    if (!r?.error) return toProfile(r.data);
    const e2: any = r.error;
    throw new Error(`${mapPgErrorToMessage(e2.code, e2.message)} [profiles.select(id): ${e2.message}${e2.details ? ` | ${e2.details}` : ''}${e2.hint ? ` | ${e2.hint}` : ''}]`);
  }

  // 3) Autre erreur: remonter message générique contextualisé
  throw new Error(`${mapPgErrorToMessage(e1?.code, e1?.message)} [profiles.select(user_id): ${e1?.message}${e1?.details ? ` | ${e1.details}` : ''}${e1?.hint ? ` | ${e1.hint}` : ''}]`);
}

export async function upsertMyProfile(input: ProfileInput): Promise<Profile> {
  const session = (await supabase.auth.getSession()).data.session;
  const userId = session?.user.id;
  if (!userId) throw new Error("Vous devez être connecté.");

  // Nettoyage: on ne pousse que les clés définies
  const base: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) base[k] = v;
  }

  const table = supabase.from("profiles");

  // 1) UPDATE ciblé (évite un INSERT si la ligne existe déjà et contourne NOT NULL)
  const updateOnce = async (key: "user_id" | "id", payload: Record<string, any>): Promise<Profile | null> => {
    if (Object.keys(payload).length === 0) return null; // rien à mettre à jour
    let res: any = await table.update(payload).eq(key, userId).select("*");
    // Nettoyage des colonnes inexistantes
    if (res?.error) {
      const err = res.error;
      const m = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(err?.message || "");
      if (m) {
        const bad = m[1];
        if (bad in payload) {
          const next = { ...payload } as Record<string, any>;
          delete next[bad];
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
    const row = (res?.data as any[])?.[0] ?? null;
    if (!row) return null;
    return {
      id: (row.user_id ?? row.id) as string,
      login: row.login ?? null,
      full_name: row.full_name ?? null,
      birthdate: row.birthdate ?? null,
      height_cm: row.height_cm ?? null,
      weight_kg: row.weight_kg ?? null,
      bmi: row.bmi ?? null,
      avatar_url: row.avatar_url ?? null,
      is_private: row.is_private ?? null,
      is_disabled: row.is_disabled ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    } as Profile;
  };

  let updated = await updateOnce("user_id", base);
  if (!updated) updated = await updateOnce("id", base);
  if (updated) return updated;

  // 2) INSERT avec login de secours si absent (évite NOT NULL)
  const makeFallbackLogin = () => {
    const email = session?.user.email ?? "";
    const local = (email.split("@")[0] || "user").replace(/[^a-z0-9_\-]/gi, "").toLowerCase();
    return `${local || "user"}_${userId.slice(0, 8)}`;
  };

  const insertWithKey = async (key: "user_id" | "id") => {
    const payload: Record<string, any> = { ...base };
    payload[key] = userId;
    if (!("login" in payload) || payload.login == null || String(payload.login).trim() === "") {
      payload.login = makeFallbackLogin();
    }
    let res: any = await table.insert(payload).select("*").single();
    if (res?.error) {
      const err = res.error;
      const raw = err?.message || "";
      const m = /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i.exec(raw);
      if (m) {
        const bad = m[1];
        const next = { ...payload } as Record<string, any>;
        delete next[bad];
        res = await table.insert(next).select("*").single();
        if (res?.error) throw new Error(mapPgErrorToMessage(res.error.code, res.error.message));
      } else if (/null value in column\s+"login"/i.test(raw)) {
        const next = { ...payload, login: makeFallbackLogin() };
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
    const row = res.data as any;
    return {
      id: (row.user_id ?? row.id) as string,
      login: row.login ?? null,
      full_name: row.full_name ?? null,
      birthdate: row.birthdate ?? null,
      height_cm: row.height_cm ?? null,
      weight_kg: row.weight_kg ?? null,
      bmi: row.bmi ?? null,
      avatar_url: row.avatar_url ?? null,
      is_private: row.is_private ?? null,
      is_disabled: row.is_disabled ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    } as Profile;
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
  let upd: any = await table.update({ avatar_url: filePath }).eq("user_id", userId);
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
    const fallbackLogin = (session?.user.email?.split("@")[0] || "user").replace(/[^a-z0-9_\-]/gi, "").toLowerCase() + `_${userId.slice(0, 8)}`;
    let ins: any = await table.insert({ user_id: userId, avatar_url: filePath, login: fallbackLogin });
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
  let r: any = await table.select("user_id", { count: "exact" }).ilike("login", candidate).neq("user_id", userId ?? "00000000-0000-0000-0000-000000000000");
  if (r?.error) {
    const e: any = r.error;
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
  const arr = (r?.data as any[]) ?? [];
  return arr.length === 0;
}
