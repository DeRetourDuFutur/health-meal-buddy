import { supabaseAdmin } from "../lib/supabaseAdmin";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase();
}

async function main() {
  const { data, error } = await supabaseAdmin.from("pathologies").select("id,label,code");
  if (error) throw new Error(error.message);
  const list = data ?? [];

  const updates: Array<{ id: string; code: string; label: string }> = [];
  for (const p of list as Array<{ id: string; label: string; code: string | null }>) {
    const n = normalize(p.label || "");
    const isChol = n.includes("cholesterol");
    const isDiab2 = n.includes("diabete") && (n.includes("type 2") || n.includes("type ii"));
    if (isChol && p.code !== "CH") updates.push({ id: p.id, code: "CH", label: p.label });
    if (isDiab2 && p.code !== "D2") updates.push({ id: p.id, code: "D2", label: p.label });
  }

  if (updates.length === 0) {
    console.log("No updates needed.");
    return;
  }

  // Check potential conflicts first
  const wantedCodes = Array.from(new Set(updates.map((u) => u.code)));
  const { data: existing, error: errExisting } = await supabaseAdmin
    .from("pathologies")
    .select("id,code,label")
    .in("code", wantedCodes);
  if (errExisting) throw new Error(errExisting.message);
  const byCode = new Map((existing ?? []).map((e: any) => [String(e.code), e]));

  for (const u of updates) {
    const other = byCode.get(u.code);
    if (other && String(other.id) !== String(u.id)) {
      console.warn(`Conflict: code ${u.code} already used by '${other.label}' (id=${other.id}). Skipping '${u.label}' (id=${u.id}).`);
      continue;
    }
    const { error: updErr } = await supabaseAdmin.from("pathologies").update({ code: u.code }).eq("id", u.id);
    if (updErr) {
      console.error(`Failed to update '${u.label}' -> ${u.code}:`, updErr.message);
    } else {
      console.log(`Updated '${u.label}' -> ${u.code}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
