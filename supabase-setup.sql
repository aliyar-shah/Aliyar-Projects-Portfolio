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


-- ── 3. ADDITIONAL CONTENT TABLES ──────────────────────────

-- Generic site content — one JSON blob per section
CREATE TABLE IF NOT EXISTS public.site_content (
  section_key TEXT PRIMARY KEY,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.site_content (section_key, data) VALUES
  ('contact',   '{"email":"syedaliyarshah@outlook.com","phone":"(+92) 335-9926750","linkedin":"https://www.linkedin.com/in/syed-aliyar-shah-00a06b248/"}'),
  ('welcome',   '{"text":"Welcome! I am a Mechanical Design and Simulation Engineer with expertise in EV battery systems, CAE (FEA/CFD), composite materials, and multi-physics modeling. Currently pursuing advanced research in structural mechanics, sustainable energy systems, and computational methods. I hold a Bachelor''s in Mechanical Engineering from NUST and have industry experience with Ohmitron Inc. (USA) working on high-voltage EV systems and power electronics."}'),
  ('education', '{"degree":"Bachelor of Engineering in Mechanical Engineering","institution":"National University of Sciences and Technology (NUST)","college":"College of Electrical & Mechanical Engineering (CEME)","location":"Islamabad, Pakistan","duration":"November 2021 - May 2025","keyAreas":["Finite Element Analysis (FEA) & CAD/CAE/CAM","Composite Materials & Multi-physics Modeling","Structural & Thermal Analysis","Fluid Dynamics / CFD Simulations"],"thesis":"Design and Development of Non-Ceramic Glass Fiber-Epoxy Composite Insulator for Power Lines"}')
ON CONFLICT (section_key) DO NOTHING;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_content"
  ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Auth write site_content"
  ON public.site_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Publications
CREATE TABLE IF NOT EXISTS public.publications (
  id          BIGSERIAL PRIMARY KEY,
  sort_order  INTEGER DEFAULT 0,
  title       TEXT NOT NULL DEFAULT '',
  authors     TEXT DEFAULT '',
  journal     TEXT DEFAULT '',
  year        TEXT DEFAULT '',
  status      TEXT DEFAULT 'in-preparation',
  status_text TEXT DEFAULT '',
  doi         TEXT DEFAULT '',
  link        TEXT DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read publications"
  ON public.publications FOR SELECT USING (true);
CREATE POLICY "Auth write publications"
  ON public.publications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Work Experience
CREATE TABLE IF NOT EXISTS public.work_experience (
  id               TEXT PRIMARY KEY,
  sort_order       INTEGER DEFAULT 0,
  title            TEXT NOT NULL DEFAULT '',
  company          TEXT DEFAULT '',
  location         TEXT DEFAULT '',
  duration         TEXT DEFAULT '',
  description      TEXT DEFAULT '',
  responsibilities JSONB DEFAULT '[]',
  skills           JSONB DEFAULT '[]',
  images           JSONB DEFAULT '[]',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read work_experience"
  ON public.work_experience FOR SELECT USING (true);
CREATE POLICY "Auth write work_experience"
  ON public.work_experience FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Awards & Honors
CREATE TABLE IF NOT EXISTS public.awards (
  id           TEXT PRIMARY KEY,
  sort_order   INTEGER DEFAULT 0,
  category     TEXT DEFAULT 'award',
  title        TEXT NOT NULL DEFAULT '',
  organization TEXT DEFAULT '',
  year         TEXT DEFAULT '',
  description  TEXT DEFAULT '',
  images       JSONB DEFAULT '[]',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read awards"
  ON public.awards FOR SELECT USING (true);
CREATE POLICY "Auth write awards"
  ON public.awards FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Certifications
CREATE TABLE IF NOT EXISTS public.certifications (
  id              TEXT PRIMARY KEY,
  sort_order      INTEGER DEFAULT 0,
  title           TEXT NOT NULL DEFAULT '',
  issuer          TEXT DEFAULT '',
  areas           JSONB DEFAULT '[]',
  credential_link TEXT DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read certifications"
  ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Auth write certifications"
  ON public.certifications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Projects (design + research)
CREATE TABLE IF NOT EXISTS public.projects (
  id            TEXT PRIMARY KEY,
  sort_order    INTEGER DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'design',
  title         TEXT NOT NULL DEFAULT '',
  org           TEXT DEFAULT '',
  period        TEXT DEFAULT '',
  summary       TEXT DEFAULT '',
  problem       JSONB DEFAULT '[]',
  role          JSONB DEFAULT '[]',
  methods       JSONB DEFAULT '[]',
  results       JSONB DEFAULT '[]',
  phd_direction JSONB DEFAULT '[]',
  tags          JSONB DEFAULT '[]',
  images        JSONB DEFAULT '[]',
  paper_status  TEXT DEFAULT '',
  paper_link    TEXT DEFAULT '',
  status        TEXT DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects"
  ON public.projects FOR SELECT USING (true);
CREATE POLICY "Auth write projects"
  ON public.projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 4. STORAGE BUCKET ──────────────────────────────────────
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
