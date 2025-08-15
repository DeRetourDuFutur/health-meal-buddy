import { config } from "dotenv";
config({ path: ".env.local" }); // <-- charge tes vars pour les scripts Node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE as string;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

// Client admin (⚠ service_role = serveur seulement)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
