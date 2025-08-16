-- Étape 18 — Recettes (MVP)
-- Idempotent: crée tables, indexes, triggers updated_at et RLS si absents

-- recipes
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

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

do $$
begin
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

-- recipe_items
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

do $$
begin
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
