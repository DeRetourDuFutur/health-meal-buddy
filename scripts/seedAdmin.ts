import { supabaseAdmin } from "../lib/supabaseAdmin";

async function seedAdmin() {
  const email = "tyson.nomansa@gmail.com";
  const password = "abc123DEF";

  // Vérifie si l'utilisateur existe déjà
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Erreur lors de la récupération des utilisateurs:", listError.message);
    process.exit(1);
  }

  const exists = users.users.find((u) => u.email === email);
  if (exists) {
    console.log("✅ Admin existe déjà:", email);
    process.exit(0);
  }

  // Crée l'utilisateur admin
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" }
  });

  if (error) {
    console.error("Erreur création admin:", error.message);
    process.exit(1);
  }

  console.log("✅ Admin créé avec succès:", data.user?.email);
}

seedAdmin();
