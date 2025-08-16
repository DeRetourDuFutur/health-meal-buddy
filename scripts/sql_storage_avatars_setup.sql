-- Crée le bucket private "avatars" si absent et applique une stratégie simple.
-- A exécuter une fois dans Supabase SQL.
-- Idempotent: ne casse rien si déjà présent.

-- 1) Créer le bucket s'il n'existe pas
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', false
where not exists (select 1 from storage.buckets where id = 'avatars');

-- 2) Appliquer (si absente) une politique simple permettant à l'utilisateur de gérer son propre dossier
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies
		WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars users can manage own folder'
	) THEN
		CREATE POLICY "avatars users can manage own folder" ON storage.objects
		FOR ALL
		USING (
			bucket_id = 'avatars' AND (auth.uid()::text = (regexp_split_to_array(name, '/'))[1])
		)
		WITH CHECK (
			bucket_id = 'avatars' AND (auth.uid()::text = (regexp_split_to_array(name, '/'))[1])
		);
	END IF;
END $$;

-- 3) (optionnel) Vérifier
select id, name, public from storage.buckets where id='avatars';
