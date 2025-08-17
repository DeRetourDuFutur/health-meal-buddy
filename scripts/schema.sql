-- NutriSanté+ — Schéma SQL consolidé (DDL global)
-- Version: alignée avec CDC v1.1 (2025-08-17)
-- Remarque: ce script est idempotent autant que possible.

-- Extensions (selon environnement Supabase, pgcrypto est souvent déjà présent)
create extension if not exists pgcrypto;

-- Fonction utilitaire: mise à jour du champ updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 1) Profils
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login text unique,
  first_name text,
  last_name text,
  age int,
  height_cm numeric(10,2),
  weight_kg numeric(10,2),
  needs_kcal numeric(10,2),
  needs_protein_g numeric(10,2),
  needs_carbs_g numeric(10,2),
  needs_fat_g numeric(10,2),
  needs_display_mode text check (needs_display_mode in ('absolute','percent')) default 'absolute',
  privacy jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own') then
    create policy profiles_select_own on public.profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_upsert_own') then
    create policy profiles_upsert_own on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- 2) Pathologies (défaut)
create table if not exists public.pathologies (
  id uuid primary key default gen_random_uuid(),
  code text,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_pathologies_updated_at on public.pathologies;
create trigger set_pathologies_updated_at before update on public.pathologies
for each row execute function public.set_updated_at();

alter table public.pathologies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pathologies' and policyname='pathologies_select_all') then
    create policy pathologies_select_all on public.pathologies for select using (true);
  end if;
end $$;

-- 3) Lien user ↔ pathologies « défaut »
create table if not exists public.user_pathologies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pathology_id uuid not null references public.pathologies(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists user_pathologies_user_idx on public.user_pathologies(user_id);
create unique index if not exists user_pathologies_uniq on public.user_pathologies(user_id, pathology_id);

alter table public.user_pathologies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_pathologies' and policyname='user_pathologies_select_own') then
    create policy user_pathologies_select_own on public.user_pathologies for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_pathologies' and policyname='user_pathologies_ins_own') then
    create policy user_pathologies_ins_own on public.user_pathologies for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_pathologies' and policyname='user_pathologies_del_own') then
    create policy user_pathologies_del_own on public.user_pathologies for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 4) Pathologies personnelles
create table if not exists public.custom_pathologies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  code text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custom_pathologies_label_ci_uniq on public.custom_pathologies(user_id, lower(label));

drop trigger if exists set_custom_pathologies_updated_at on public.custom_pathologies;
create trigger set_custom_pathologies_updated_at before update on public.custom_pathologies
for each row execute function public.set_updated_at();

alter table public.custom_pathologies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='custom_pathologies' and policyname='custom_pathologies_select_own') then
    create policy custom_pathologies_select_own on public.custom_pathologies for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='custom_pathologies' and policyname='custom_pathologies_cud_own') then
    create policy custom_pathologies_cud_own on public.custom_pathologies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- 5) Aliments
create table if not exists public.aliments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kcal_per_100g numeric(10,2) not null default 0,
  protein_g_per_100g numeric(10,2) not null default 0,
  carbs_g_per_100g numeric(10,2) not null default 0,
  fat_g_per_100g numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aliments_user_id_idx on public.aliments(user_id);
create unique index if not exists aliments_user_name_uniq on public.aliments(user_id, name);

drop trigger if exists set_aliments_updated_at on public.aliments;
create trigger set_aliments_updated_at before update on public.aliments
for each row execute function public.set_updated_at();

alter table public.aliments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_select_own') then
    create policy aliments_select_own on public.aliments for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_insert_own') then
    create policy aliments_insert_own on public.aliments for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_update_own') then
    create policy aliments_update_own on public.aliments for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='aliments' and policyname='aliments_delete_own') then
    create policy aliments_delete_own on public.aliments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 6) Recettes
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(10,2) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);
create unique index if not exists recipes_user_name_uniq on public.recipes(user_id, name);

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_select_own') then
    create policy recipes_select_own on public.recipes for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_insert_own') then
    create policy recipes_insert_own on public.recipes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_update_own') then
    create policy recipes_update_own on public.recipes for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipes' and policyname='recipes_delete_own') then
    create policy recipes_delete_own on public.recipes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 7) Ingrédients de recette
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  aliment_id uuid not null references public.aliments(id) on delete cascade,
  quantity_g numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipe_items_recipe_id_idx on public.recipe_items(recipe_id);
create index if not exists recipe_items_aliment_id_idx on public.recipe_items(aliment_id);
create unique index if not exists recipe_items_uniq on public.recipe_items(recipe_id, aliment_id);

drop trigger if exists set_recipe_items_updated_at on public.recipe_items;
create trigger set_recipe_items_updated_at before update on public.recipe_items
for each row execute function public.set_updated_at();

alter table public.recipe_items enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_select_own') then
    create policy recipe_items_select_own on public.recipe_items
      for select using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_insert_own') then
    create policy recipe_items_insert_own on public.recipe_items
      for insert with check (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_update_own') then
    create policy recipe_items_update_own on public.recipe_items
      for update using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recipe_items' and policyname='recipe_items_delete_own') then
    create policy recipe_items_delete_own on public.recipe_items
      for delete using (exists (select 1 from public.recipes r where r.id = recipe_items.recipe_id and r.user_id = auth.uid()));
  end if;
end $$;

-- 8) RPC d’admin (exemple) — restreindre l’exécution à un rôle admin approprié
create or replace function public.delete_pathology(p_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from public.pathologies where id = p_id;
end; $$;

revoke all on function public.delete_pathology(uuid) from public;
-- grant execute on function public.delete_pathology(uuid) to app_admin; -- à adapter selon votre rôle d’admin

-- 9) Storage (avatars)
-- Créer un bucket privé `avatars` dans Supabase Storage (via interface ou API) et définir la policy:
--   - lecture/écriture limitées au propriétaire (chemin <uid>/...)
-- La définition des buckets se fait côté API/console, pas par SQL DDL standard.
