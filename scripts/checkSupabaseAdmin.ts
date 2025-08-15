import { config } from "dotenv";
config({ path: ".env.local" });

import { supabaseAdmin } from "../lib/supabaseAdmin";

(async () => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    console.log("✅ Supabase admin OK. Users fetched:", data?.users?.length ?? 0);
    process.exit(0);
  } catch (e: any) {
    console.error("❌ Supabase admin error:", e?.message ?? e);
    process.exit(1);
  }
})();
