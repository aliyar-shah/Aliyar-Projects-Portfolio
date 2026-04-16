-- ============================================================
-- SUPABASE SETUP — run this entire script once in:
--   Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. TABLES ──────────────────────────────────────────────

-- Profile metadata (single row with id = 'main')
CREATE TABLE IF NOT EXISTS public.profile (
  id         TEXT PRIMARY KEY DEFAULT 'main',
  name       TEXT             DEFAULT 'Syed Aliyar Shah',
  title      TEXT             DEFAULT 'Mechanical Design & Simulation Engineer',
  photo_url  TEXT,
  updated_at TIMESTAMPTZ      DEFAULT NOW()
);

-- Seed the row so it always exists
INSERT INTO public.profile (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;


-- Documents metadata (rows: 'cv', 'portfolio', 'research')
CREATE TABLE IF NOT EXISTS public.documents (
  id          TEXT PRIMARY KEY,  -- 'cv' | 'portfolio' | 'research'
  title       TEXT,
  subtitle    TEXT,
  file_url    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rows
INSERT INTO public.documents (id, title, subtitle) VALUES
  ('cv',        'Curriculum Vitae',           'Complete academic and professional background'),
  ('portfolio', 'Design Projects Portfolio',  'Comprehensive collection of engineering design projects'),
  ('research',  'Research & Publications',    'Academic research papers and technical reports')
ON CONFLICT (id) DO NOTHING;


-- ── 2. ROW LEVEL SECURITY ──────────────────────────────────

-- Enable RLS
ALTER TABLE public.profile   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Public can read both tables
CREATE POLICY "Public read profile"
  ON public.profile FOR SELECT USING (true);

CREATE POLICY "Public read documents"
  ON public.documents FOR SELECT USING (true);

-- Only authenticated users can modify data
CREATE POLICY "Auth write profile"
  ON public.profile FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth write documents"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 3. STORAGE BUCKET ──────────────────────────────────────
-- Run this in the SQL editor (storage API is available via SQL).

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-files', 'portfolio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to all files in the bucket
CREATE POLICY "Public read portfolio-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-files');

-- Only authenticated users can upload / replace / delete
CREATE POLICY "Auth upload portfolio-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio-files' AND auth.role() = 'authenticated');

CREATE POLICY "Auth update portfolio-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portfolio-files' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete portfolio-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio-files' AND auth.role() = 'authenticated');
