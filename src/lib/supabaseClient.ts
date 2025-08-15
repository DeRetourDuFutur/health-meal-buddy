import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ne casse pas le build; on laissera l’étape 8 documenter l’ENV requise.
  // eslint-disable-next-line no-console
  console.warn("[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
