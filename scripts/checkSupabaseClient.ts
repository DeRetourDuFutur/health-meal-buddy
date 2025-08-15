import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL as string;
const anon = process.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anon);

(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log("✅ Supabase client OK", Boolean(data.session));
    process.exit(0);
  } catch (e: any) {
    console.error("❌ Supabase client error:", e?.message ?? e);
    process.exit(1);
  }
})();
