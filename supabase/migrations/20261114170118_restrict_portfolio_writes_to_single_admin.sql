-- Restrict portfolio content writes to the single owner account.
-- Public visitors retain read-only access. No portfolio rows are changed.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profile', 'documents', 'site_content', 'publications', 'work_experience', 'awards', 'certifications', 'projects'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Auth write ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = %L::uuid)', 'Admin insert ' || t, t, '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = %L::uuid) WITH CHECK ((select auth.uid()) = %L::uuid)', 'Admin update ' || t, t, '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7', '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = %L::uuid)', 'Admin delete ' || t, t, '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7');
  END LOOP;
END $$;

-- Keep public object reads; restrict uploads, replacements, and deletion to the owner.
DROP POLICY IF EXISTS "Auth upload portfolio-files" ON storage.objects;
DROP POLICY IF EXISTS "Auth update portfolio-files" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete portfolio-files" ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio-files" ON storage.objects;

CREATE POLICY "Public read portfolio-files"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portfolio-files');

CREATE POLICY "Admin upload portfolio-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio-files' AND (select auth.uid()) = '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7'::uuid);

CREATE POLICY "Admin update portfolio-files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio-files' AND (select auth.uid()) = '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7'::uuid)
  WITH CHECK (bucket_id = 'portfolio-files' AND (select auth.uid()) = '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7'::uuid);

CREATE POLICY "Admin delete portfolio-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio-files' AND (select auth.uid()) = '3fc63fa1-9a47-453a-9b23-5b5b3ef6ddc7'::uuid);
