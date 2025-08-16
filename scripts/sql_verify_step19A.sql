-- Step 19.A — Script de vérification complet
-- A exécuter dans l'éditeur SQL Supabase (ou psql) sur la base de votre projet.
-- Il liste:
--  - Triggers attendus
--  - RLS activée sur les 4 tables
--  - Policies (user/admin) sur les 4 tables
--  - Policies Storage avatars_* (admin)
--  - Fonctions support
--  - Index unique sur login (lower)
--  - Colonne BMI en "generated always"
-- Astuce Supabase Studio: après avoir exécuté tout le script, utilisez la pagination des résultats (chevrons « x of y »)
-- pour naviguer entre les différents jeux de résultats. Vous pouvez aussi exécuter chaque section séparément
-- en sélectionnant le bloc et en cliquant sur Run.

-- 1) Triggers attendus
--    set_profiles_updated_at, trg_profiles_audit sur public.profiles
--    set_user_pathologies_updated_at sur public.user_pathologies
select c.relname as table_name,
       t.tgname  as trigger_name,
       t.tgenabled,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t
join pg_class   c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'user_pathologies')
  and t.tgname in ('set_profiles_updated_at', 'trg_profiles_audit', 'set_user_pathologies_updated_at')
order by c.relname, t.tgname;

-- 2) RLS activée sur les 4 tables
select c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','pathologies','user_pathologies','profile_history')
order by c.relname;

-- 3) Policies — liste complète (vérifier présence user/admin par table)
select schemaname, tablename, policyname, cmd, roles, permissive, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','pathologies','user_pathologies','profile_history')
order by tablename, policyname;

-- 3.b) Aide — détection heuristique des policies admin vs user
--     admin: fait référence à auth_is_admin() (ou équivalent)
--     user : fait référence à auth.uid() et éventuellement is_disabled = false
select tablename,
       policyname,
       cmd,
       case when (qual ilike '%auth_is_admin%' or with_check ilike '%auth_is_admin%') then 'admin'
            when (qual ilike '%auth.uid%'      or with_check ilike '%auth.uid%')      then 'user'
            else 'other'
       end as policy_type,
       qual,
       with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','pathologies','user_pathologies','profile_history')
order by tablename, policy_type, policyname;

-- 4) Storage — policies avatars_admin_* sur storage.objects
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='storage'
  and tablename='objects'
  and policyname in ('avatars_admin_select','avatars_admin_insert','avatars_admin_update','avatars_admin_delete')
order by policyname;

-- 5) Fonctions support: set_updated_at, auth_is_admin, profile_audit_on_update
select n.nspname as schema_name,
       p.oid::regprocedure::text as signature,
       l.lanname as language
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language  l on l.oid = p.prolang
where n.nspname='public'
  and p.proname in ('set_updated_at','auth_is_admin','profile_audit_on_update')
order by p.proname;

-- 6) Index unique profiles_login_lower_uniq (doit contenir lower(login))
select c2.relname as index_name,
       ix.indisunique as is_unique,
       pg_get_indexdef(ix.indexrelid) as index_def
from pg_index ix
join pg_class c  on c.oid = ix.indrelid
join pg_class c2 on c2.oid = ix.indexrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public'
  and c.relname='profiles'
  and c2.relname='profiles_login_lower_uniq';

-- 7) Colonne BMI générée (ALWAYS)
select table_schema, table_name, column_name, data_type,
       is_generated, generation_expression
from information_schema.columns
where table_schema='public'
  and table_name='profiles'
  and column_name='bmi';

-- 8) Résumé synthétique (une ligne, booleans): TRUE = OK
select
  -- Triggers
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='profiles' and t.tgname='set_profiles_updated_at'
  ) as has_trigger_set_profiles_updated_at,
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='profiles' and t.tgname='trg_profiles_audit'
  ) as has_trigger_trg_profiles_audit,
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='user_pathologies' and t.tgname='set_user_pathologies_updated_at'
  ) as has_trigger_set_user_pathologies_updated_at,

  -- RLS activée par table
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='profiles')          as rls_profiles,
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='pathologies')       as rls_pathologies,
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='user_pathologies')  as rls_user_pathologies,
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='profile_history')   as rls_profile_history,

  -- Policies admin/user par table (détection heuristique)
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='profiles'          and (p.qual ilike '%auth_is_admin%' or p.with_check ilike '%auth_is_admin%')) as pol_profiles_admin,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='profiles'          and (p.qual ilike '%auth.uid%'      or p.with_check ilike '%auth.uid%'))      as pol_profiles_user,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='pathologies'       and (p.qual ilike '%auth_is_admin%' or p.with_check ilike '%auth_is_admin%')) as pol_pathologies_admin,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='pathologies'       and (p.qual ilike '%auth.uid%'      or p.with_check ilike '%auth.uid%'))      as pol_pathologies_user,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='user_pathologies'  and (p.qual ilike '%auth_is_admin%' or p.with_check ilike '%auth_is_admin%')) as pol_user_pathologies_admin,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='user_pathologies'  and (p.qual ilike '%auth.uid%'      or p.with_check ilike '%auth.uid%'))      as pol_user_pathologies_user,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='profile_history'   and (p.qual ilike '%auth_is_admin%' or p.with_check ilike '%auth_is_admin%')) as pol_profile_history_admin,
  exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename='profile_history'   and (p.qual ilike '%auth.uid%'      or p.with_check ilike '%auth.uid%'))      as pol_profile_history_user,

  -- Storage avatars admin policies (4 présentes)
  (
    select count(*) = 4
    from pg_policies p
    where p.schemaname='storage' and p.tablename='objects'
      and p.policyname in ('avatars_admin_select','avatars_admin_insert','avatars_admin_update','avatars_admin_delete')
  ) as storage_avatars_admin_4,

  -- Fonctions présentes
  exists (select 1 from pg_proc pr join pg_namespace n on n.oid=pr.pronamespace where n.nspname='public' and pr.proname='set_updated_at')           as fn_set_updated_at,
  exists (select 1 from pg_proc pr join pg_namespace n on n.oid=pr.pronamespace where n.nspname='public' and pr.proname='auth_is_admin')            as fn_auth_is_admin,
  exists (select 1 from pg_proc pr join pg_namespace n on n.oid=pr.pronamespace where n.nspname='public' and pr.proname='profile_audit_on_update')  as fn_profile_audit_on_update,

  -- Index unique + usage de lower(login)
  exists (
    select 1
    from pg_index ix
    join pg_class c  on c.oid = ix.indrelid
    join pg_class c2 on c2.oid = ix.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='profiles' and c2.relname='profiles_login_lower_uniq' and ix.indisunique
  ) as idx_profiles_login_lower_uniq_unique,
  (
    select coalesce(
     (case when ix.indexprs is not null then pg_get_expr(ix.indexprs, ix.indrelid) ilike '%lower%login%'
       else null end),
     pg_get_indexdef(ix.indexrelid) ilike '%lower%login%'
       )
    from pg_index ix
    join pg_class c  on c.oid = ix.indrelid
    join pg_class c2 on c2.oid = ix.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='profiles' and c2.relname='profiles_login_lower_uniq'
    limit 1
  ) as idx_uses_lower_login,

  -- Colonne BMI generated always
  (
    select is_generated='ALWAYS'
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='bmi'
  ) as bmi_generated_always;
