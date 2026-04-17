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
DROP POLICY IF EXISTS "Public read profile"    ON public.profile;
DROP POLICY IF EXISTS "Auth write profile"     ON public.profile;
DROP POLICY IF EXISTS "Public read documents"  ON public.documents;
DROP POLICY IF EXISTS "Auth write documents"   ON public.documents;

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
DROP POLICY IF EXISTS "Public read site_content" ON public.site_content;
DROP POLICY IF EXISTS "Auth write site_content"  ON public.site_content;
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
DROP POLICY IF EXISTS "Public read publications" ON public.publications;
DROP POLICY IF EXISTS "Auth write publications"  ON public.publications;
CREATE POLICY "Public read publications"
  ON public.publications FOR SELECT USING (true);
CREATE POLICY "Auth write publications"
  ON public.publications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed initial publications
INSERT INTO public.publications (sort_order, title, authors, journal, year, status, status_text, doi, link) VALUES
  (0, 'Assessment of Impact Resistance Characteristics of 3D-Printed Polymers',
   'M. R. Khan, S. Ali, I. Asim, S. A. Shah, M. Ahmad',
   'Key Engineering Materials', '2025', 'published', '', '10.4028/p-g8owyW', 'https://doi.org/10.4028/p-g8owyW'),
  (1, 'Design, Analysis and Comparison of Hybrid & Non-Pneumatic Tires',
   'S. Ali, S. A. Shah, M. Ahmad, S. M. Zain, A. R. Khan',
   'ACI Avances En Ciencias E Ingenierías', '2025', 'published', '', '10.18272/aci.3909', 'https://doi.org/10.18272/aci.3909'),
  (2, 'Comprehensive Characterization of GFRP Composite Insulators for High-Voltage Overhead Lines',
   'S. A. Shah, S. Ali, A. R. Khan, Z. Sajid',
   'Materials & Energy Systems Journal', '', 'under-review', 'Manuscript Under Review', '', ''),
  (3, 'High-Performance Composites for Aerospace, Hydrogen Fuel Storage, and Nuclear Technologies: A Review',
   'S. Ali, S. A. Shah',
   'Advanced Materials Review', '', 'under-review', 'Manuscript Under Review', '', ''),
  (4, 'Computational Approaches for Dynamic Crack Propagation: Review',
   'S. A. Shah, S. Ali',
   'Mechanics of Materials', '', 'in-preparation', '', '', ''),
  (5, 'Experimental and Computational Validation of Mechanical and Failure Modes in GFRP Epoxy Composite Rods for HV Insulators',
   'S. A. Shah, M. R. Khan',
   'Polymers', '', 'in-preparation', '', '', '')
ON CONFLICT DO NOTHING;


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
DROP POLICY IF EXISTS "Public read work_experience" ON public.work_experience;
DROP POLICY IF EXISTS "Auth write work_experience"  ON public.work_experience;
CREATE POLICY "Public read work_experience"
  ON public.work_experience FOR SELECT USING (true);
CREATE POLICY "Auth write work_experience"
  ON public.work_experience FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed initial work experience
INSERT INTO public.work_experience (id, sort_order, title, company, location, duration, description, responsibilities, skills, images) VALUES
  ('ohmitron', 0,
   'Mechanical Design and Simulation Engineer', 'Ohmitron, Inc', 'Irvine, California, USA', 'Aug 2023 - Present',
   'Leading mechanical design and simulation for EV battery systems and power electronics.',
   '["HV Li-ion Battery Packs - Design and thermal management","MegaWatt Charging Systems - Power electronics packaging","Power Electronics Modules - Thermal and structural analysis","Si-C based HV Inverters/Converters - Design optimization","12V Li-ion Batteries - Automotive applications","On-Board Chargers - Mechanical integration"]',
   '["CAD/CAE (SolidWorks, ANSYS)","FEM&A (Structural, Thermal, Modal)","Thermal CFD Analysis","Materials: Al, Steel, ABS-PC, GFRP","DFMEA, DVP&R","GD&T, DFA/DFM"]',
   '["experience/ohmitron/ohmitron-1.png","experience/ohmitron/ohmitron-2.png","experience/ohmitron/ohmitron-3.png","experience/ohmitron/ohmitron-4.png"]'),
  ('polymer-industries', 1,
   'R&D Engineer', 'Polymer Private Industries', 'Gujranwala, Pakistan', 'Jun 2024 - Apr 2025',
   'Research and development of non-ceramic GFRP composite insulators for power transmission.',
   '["Design and Development of non-ceramic GFRP Composite Insulator","Composite mechanics R&D","ASTM/ANSI testing protocols","FEA in ABAQUS for composite structures"]',
   '["Composite Materials","GFRP Design","ASTM/ANSI Standards","ABAQUS FEA","Experimental Testing"]',
   '["experience/polymer-industries/polymer-1.png","experience/polymer-industries/polymer-2.png","experience/polymer-industries/polymer-3.png"]'),
  ('nust-lab', 2,
   'Research Assistant', 'NUST Advanced Manufacturing Lab', 'Islamabad, Pakistan', 'Jun 2024 - Apr 2025',
   'Research assistant focusing on impact testing and polymer characterization.',
   '["Impact testing of 3D-printed polymers","Polymer characterization studies","FEA workflows development","Co-authored research publications"]',
   '["Impact Testing","Material Characterization","FEA","Research Methodology","Technical Writing"]',
   '["experience/nust-lab/lab-1.png","experience/nust-lab/lab-2.png","experience/nust-lab/lab-3.png"]'),
  ('enertia', 3,
   'Mechanical Design Engineer', 'Enertia', 'Lahore, Pakistan', 'Apr 2025 - Jul 2025',
   'Mechanical design for HVAC and thermal systems.',
   '["Heat Pump Water Heater design","Pressure Vessel analysis","HVAC component development"]',
   '["Thermal Design","Pressure Vessel Design","HVAC Systems","CAD Modeling"]',
   '["experience/enertia/enertia-1.png","experience/enertia/enertia-2.png"]'),
  ('proceedit', 4,
   'Trainee Engineer (Contractual)', 'Proceedit', 'Barcelona, Spain', 'Sep 2025 - Nov 2025',
   'Manufacturing automation and process optimization training.',
   '["Manufacturing workflow optimization","Robot automation programming","Python scripting for RPA","Process documentation"]',
   '["Manufacturing Processes","Robot Automation","Python Programming","RPA (Robotic Process Automation)"]',
   '["experience/proceedit/proceedit-1.png","experience/proceedit/proceedit-2.png"]')
ON CONFLICT (id) DO NOTHING;


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
DROP POLICY IF EXISTS "Public read awards" ON public.awards;
DROP POLICY IF EXISTS "Auth write awards"  ON public.awards;
CREATE POLICY "Public read awards"
  ON public.awards FOR SELECT USING (true);
CREATE POLICY "Auth write awards"
  ON public.awards FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed initial awards
INSERT INTO public.awards (id, sort_order, category, title, organization, year, description, images) VALUES
  ('gold-medal', 0, 'honor',
   'Gold Medalist - Best Final Year Project',
   'Department of Mechanical Engineering, NUST', '2025',
   'Awarded for outstanding final year project on GFRP composite insulators.',
   '["awards/gold-medal/medal-1.png","awards/gold-medal/medal-2.png","awards/gold-medal/medal-3.png"]'),
  ('asme-xrc', 1, 'honor',
   '1st Position - ASME E-Fests XRC',
   'ASME International', '2023 & 2024',
   'First place in Autonomous Vehicle International Competition for two consecutive years.',
   '["awards/asme-xrc/xrc-1.png","awards/asme-xrc/xrc-2.png","awards/asme-xrc/xrc-3.png","awards/asme-xrc/xrc-4.png","awards/asme-xrc/xrc-5.png"]'),
  ('nust-achiever', 2, 'honor',
   'NUST High Achievers Award & Certificate of Merit',
   'NUST', '2023, 2024, 2025',
   'Recognized for academic excellence across multiple years.',
   '["awards/nust-achiever/achiever-1.png","awards/nust-achiever/achiever-2.png"]'),
  ('mars-wheel', 3, 'award',
   '1st Position - Mars Wheel and Wheel-Hub Joint National Design Competition',
   'PIAM Competition', '2023 & 2024',
   'First place in national competition for innovative wheel design.',
   '["awards/mars-wheel/wheel-1.png","awards/mars-wheel/wheel-2.png","awards/mars-wheel/wheel-3.png"]'),
  ('3dxworld', 4, 'award',
   '3DxWorld24 by 3D Experience Dassault Systemes',
   'Dassault Systemes', '2024',
   'Participated in global 3D design competition.', '[]'),
  ('formula-sae', 5, 'award',
   'Deputy Director - Formula SAE Project',
   'NUSTAG Official and ASME CEME Student Section', '2023-2024',
   'Leadership role in Formula SAE competition team.', '[]')
ON CONFLICT (id) DO NOTHING;


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
DROP POLICY IF EXISTS "Public read certifications" ON public.certifications;
DROP POLICY IF EXISTS "Auth write certifications"  ON public.certifications;
CREATE POLICY "Public read certifications"
  ON public.certifications FOR SELECT USING (true);
CREATE POLICY "Auth write certifications"
  ON public.certifications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed initial certifications
INSERT INTO public.certifications (id, sort_order, title, issuer, areas, credential_link) VALUES
  ('cswa', 0, 'Certified SolidWorks Associate (CSWA)', 'Dassault Systemes',
   '["Mechanical Design","Sustainability","Simulation","Additive Manufacturing"]',
   'https://cv.virtualtester.com/qr/?b=SLDWRKS&i=C-PGVDNPM9HG'),
  ('amorphous-alloys', 1, 'Combinatorial Development of Amorphous Alloys', 'UTP CCR, ISER', '[]', ''),
  ('ev-simulations', 2, 'Basics of Electric Vehicle Simulations Using ANSYS', 'Skill Lync', '[]', '')
ON CONFLICT (id) DO NOTHING;


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
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Auth write projects"  ON public.projects;
CREATE POLICY "Public read projects"
  ON public.projects FOR SELECT USING (true);
CREATE POLICY "Auth write projects"
  ON public.projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- Seed initial projects
INSERT INTO public.projects
  (id, sort_order, category, title, org, period, status, summary, problem, role, methods, results, phd_direction, tags, images, paper_status, paper_link)
VALUES
  ('hv-ev-battery-pack', 0, 'design',
   'High Voltage EV Battery Pack (900V)', 'Ohmitron, Inc', '2023–present', '',
   'Architected and validated a 900V battery pack system for heavy-duty EVs with focus on thermal runaway mitigation and fast charging capabilities.',
   '["Heavy-duty EVs require high-voltage architectures (>800V) to minimize current and conductor mass while enabling ultra-fast charging","Thermal runaway propagation in densely packed cells poses safety risks; need robust thermal management across air/liquid/immersion cooling modes","Manufacturability constraints: sheet metal fabrication, assembly tolerances (GD&T), and IP65/HVIL compliance for field deployment"]',
   '["Led mechanical design and packaging in SolidWorks: module/cell arrangement, structural enclosure, weldments, and harness routing","Performed multi-physics CAE: structural FEA (vibration, crash), thermal CFD (cooling strategies), and thermal runaway simulations in ANSYS","Collaborated with electrical team via SolidWorks Electrical for BMS integration and cable management","Applied DFA/DFM principles and GD&T to ensure manufacturability and assembly efficiency"]',
   '["CAD: SolidWorks (parametric modeling, weldments, sheet metal design, electrical routing)","FEA/CFD: ANSYS (structural analysis, modal/vibration, thermal-fluid coupling, runaway scenarios)","Standards consideration: IP65 rating targets, HVIL safety interlocks","Assumptions: Representative load profiles for commercial duty cycles; cell-level thermal properties from manufacturer data"]',
   '["Portfolio-stated: ~20 min charging time at 10C discharge rate capability","Portfolio-stated: IP65 environmental sealing with HVIL integration","Portfolio-stated: Patent/SBIR proposal activity (provisional status, not yet granted)","Design validated for structural and thermal performance under representative abuse scenarios"]',
   '["Investigate thermal runaway propagation physics via coupled electro-thermal-mechanical models validated against cell-level abuse tests","Optimize multi-objective cooling architectures (mass, cost, safety margin) using topology optimization or ML-based surrogate models","Develop predictive degradation models linking pack-level thermal gradients to cycle life under realistic drive profiles"]',
   '["Battery Systems","Thermal Management","FEA","CFD","GD&T","DFA/DFM","EV"]', '["projects/hv-ev-battery-pack/hv-battery-main.png","projects/hv-ev-battery-pack/hv-battery-cad.png","projects/hv-ev-battery-pack/hv-battery-thermal.png","projects/hv-ev-battery-pack/hv-battery-assembly.png","projects/hv-ev-battery-pack/hv-battery-testing.png"]',
   '', ''),
  ('ev-360kw-charger', 1, 'design',
   'EV 360kW DC Fast Charger (Modular)', 'Ohmitron, Inc', '2023–2024', '',
   'Designed scalable modular DC fast charger cabinet (120kW base, expandable to 360kW) with optimized thermal management and CCS1/NACS compatibility.',
   '["EV charging infrastructure needs flexibility: single cabinet must support 120–360kW via add/remove converter modules without redesign","Power electronics generate significant heat; airflow optimization critical to maintain component reliability and prevent thermal throttling","Manufacturing cost pressure: sheet metal design must balance structural rigidity, thermal performance, and DFA/DFM"]',
   '["Designed modular sheet metal cabinet in SolidWorks with GD&T for fabrication tolerances","Conducted airflow CFD and structural FEA in ANSYS to validate cooling efficiency and mechanical robustness","Integrated electrical layout via SolidWorks Electrical; coordinated with EE/software teams on cable routing and thermal constraints","Iteratively refined design for manufacturability (DFA/DFM) based on vendor feedback"]',
   '["CAD: SolidWorks (sheet metal, parametric families for module scaling)","CFD: ANSYS Fluent (forced convection, fan placement optimization, temperature mapping)","FEA: ANSYS Mechanical (static structural, vibration from fan/transport loads)","Assumptions: Ambient 25–40°C, converter heat loads from EE specifications, fan curves from vendor datasheets"]',
   '["Portfolio-stated: Modular architecture around 120kW base unit, expandable to 360kW","Portfolio-stated: Internal component temperatures maintained at 55–65°C at max load","CCS1 and NACS connector compatibility integrated per industry standards"]',
   '["Develop reduced-order thermal models (ROM) for real-time control of fan speeds based on load profiles and ambient conditions","Investigate advanced cooling topologies (liquid-cooled busbars, heat pipe integration) for next-gen >500kW chargers","Study reliability-based design optimization (RBDO) to minimize warranty costs under uncertain field conditions"]',
   '["Power Electronics","Thermal CFD","Structural FEA","Sheet Metal","DFA/DFM","EV Charging"]', '["projects/ev-360kw-charger/charger-main.png","projects/ev-360kw-charger/charger-cabinet.png","projects/ev-360kw-charger/charger-thermal-cfd.png","projects/ev-360kw-charger/charger-modules.png","projects/ev-360kw-charger/charger-assembly.png"]',
   '', ''),
  ('li-ion-12v-battery', 2, 'design',
   'Automotive Grade 12V Li-ion Battery', 'Ohmitron, Inc', '2023–2024', '',
   'Developed automotive-grade 12V Li-ion battery with extreme temperature operation and vibration/impact robustness for multi-vehicle platforms.',
   '["Replace lead-acid with Li-ion (4×3.2V prismatic cells) while meeting automotive vibration, shock, and temperature extremes (-40°C to +85°C)","Thermal management challenge: enable low-temperature operation and prevent thermal runaway in confined IP65 enclosure","Design for manufacturing: modular architecture must support multiple ampere ratings and fit diverse vehicle/stationary applications"]',
   '["Designed modular enclosure and cell holders in SolidWorks with GD&T, integrating BMS mounts and thermal pads","Performed multi-physics CAE: FEA (structural, modal, impact), thermal CFD, and fatigue analysis in ANSYS","Applied heating/cooling pads for thermal conditioning; coordinated with thermal management team on control strategy"]',
   '["CAD: SolidWorks (parametric design for scalability across ratings)","FEA: ANSYS (static, modal, frequency response, drop/impact, fatigue life estimation)","Thermal: CFD with heating pad models; low-temperature cell performance curves from vendor data","Assumptions: Cell thermal properties extrapolated to -40°C; vibration profiles per SAE J2380 or equivalent"]',
   '["Portfolio-stated: Low-temperature operation to -40°C using thermal pads and advanced cell chemistry","Portfolio-stated: Cell holder fatigue life claims (quantified cycles/safety factor not specified in source material)","IP65 rating target for environmental protection; BMS packaging validated for vibration/shock"]',
   '["Characterize cell degradation mechanisms at temperature extremes via electrochemical impedance spectroscopy (EIS) and aging studies","Develop physics-based thermal management models coupling heating pad performance with cell internal resistance evolution","Investigate composite or advanced polymer enclosures to reduce mass while maintaining impact resistance"]',
   '["Automotive Battery","Thermal Pads","FEA","Impact Analysis","IP65","BMS"]', '["projects/12v-automotive-battery/12v-battery-main.png","projects/12v-automotive-battery/12v-battery-design.png","projects/12v-automotive-battery/12v-battery-testing.png"]',
   '', ''),
  ('xrc-autonomous-vehicle', 3, 'design',
   'ASME E-Fests XRC Autonomous Vehicle', 'NUST Racing', '2023–2024', '',
   'Designed competition autonomous vehicles (2023 Ariel Atom, 2024 F1-inspired) achieving 1st place worldwide both years via chassis optimization and aerodynamic refinement.',
   '["Competition rules impose strict size/weight constraints; must maximize structural rigidity while minimizing mass for acceleration and agility","Aerodynamic drag reduction critical for maximizing speed on short autonomous track; need balance between downforce and drag","Crash safety and manufacturing feasibility: weldment design must be fabrication-ready and pass structural abuse scenarios"]',
   '["Led chassis CAD in SolidWorks: weldment framework, surface modeling for aero components, packaging of electronics/sensors","Performed FEA for crash scenarios (front/side impact) and modal analysis to avoid resonance with control system frequencies","Iterated design for weight reduction and drag minimization based on CFD feedback and competition constraints"]',
   '["CAD: SolidWorks (weldments, surface modeling for aero fairings)","FEA: Static structural and crash simulations (assumed impact speeds/directions from competition rules)","CFD: Aerodynamic drag estimation (external flow, simplified geometry)","Assumptions: Steel tube weldments, material properties from standards; aero simplifications due to low Reynolds number"]',
   '["Measured: 1st place worldwide 2023 and 2024 (official ASME E-Fests results)","Portfolio-stated: Finish times 15s (2023) and 13s (2024); ~15% speed gain via drag/weight reduction vs competitors","Design validated for structural integrity and manufacturability; successful on-track autonomous operation"]',
   '["Investigate multi-material (CFRP-steel hybrid) chassis for further weight reduction with controlled failure modes","Develop adjoint-based shape optimization for aero fairings balancing drag and downforce under competition constraints","Study crashworthiness of lightweight structures via explicit dynamic FEA validated against scaled testing"]',
   '["Chassis Design","Weldments","FEA","Aerodynamics","Lightweight","Competition","Autonomous"]', '["projects/asme-xrc-autonomous-vehicle/xrc-vehicle-main.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-cad.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-cfd.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-track.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-team.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-awards.png","projects/asme-xrc-autonomous-vehicle/xrc-vehicle-competition.png"]',
   '', ''),
  ('mercedes-f1-cad', 4, 'design',
   'Mercedes F1 CAD Model', 'Dassault Systèmes x ASME E-Fests 2024 Competition', '2024', '',
   'High-fidelity CAD modeling of Mercedes F1 car for design competition, emphasizing surface modeling accuracy and assembly complexity.',
   '["Replicate complex F1 car geometry from reference imagery and dimensional constraints without direct CAD access","Balance detail fidelity (aero surfaces, suspension kinematics) with modeling efficiency under competition time limits","Demonstrate proficiency in advanced SolidWorks techniques (surfacing, large assemblies, mates) for competition judging"]',
   '["Created full vehicle CAD model in SolidWorks: chassis, suspension, aero elements (front/rear wings, floor, diffuser), powertrain packaging","Applied surface modeling techniques for complex aero shapes; ensured geometric continuity and aesthetic accuracy","Managed large assembly structure with appropriate mates and configurations for competition presentation"]',
   '["CAD: SolidWorks (surface modeling, multi-body parts, top-down assembly design)","Reference: Competition-provided images, publicly available F1 technical regulations for dimensional constraints","Validation: Visual comparison to reference images; geometric checks for part interference and assembly feasibility"]',
   '["Competition submission completed within time constraints; demonstrated advanced SolidWorks proficiency","Model achieved design intent with accurate proportions and surface quality suitable for rendering","Positive feedback from competition judges on modeling approach and assembly organization"]',
   '["Extend CAD skills to generative design: use topology optimization for lightweight F1 components under FIA regulations","Integrate CFD-driven shape optimization workflows for aero development in parameterized CAD environment","Develop automated CAD-to-FEA pipelines for rapid design iteration and validation in motorsport applications"]',
   '["CAD","Surface Modeling","F1","SolidWorks","Competition","Aerodynamics"]', '["projects/mercedes-f1-cad/f1-main.png","projects/mercedes-f1-cad/f1-body.png","projects/mercedes-f1-cad/f1-details.png"]',
   '', ''),
  ('apu-cad-honeywell', 5, 'design',
   'Honeywell APU CAD Design (GTCP 36-150RJ & 131-9C)', 'DUNIT SOL', '2023', '',
   'Reverse-engineered detailed CAD models of Honeywell GTCP auxiliary power units from reference imagery for client deliverable.',
   '["Client required high-fidelity CAD models of specific APU variants without access to OEM CAD data","Challenge: translate 2D reference images and dimensional constraints into accurate 3D assemblies capturing functional details","Deliverable must achieve acceptable geometric fidelity (~90%) for client''s downstream use (simulation, documentation, or visualization)"]',
   '["Created detailed CAD models in SolidWorks: main body, mounting interfaces, accessory drives, external piping/harnesses","Iterated geometry based on client feedback and dimensional checks against known reference dimensions","Ensured model organization (assembly structure, part naming) suitable for client handoff"]',
   '["CAD: SolidWorks (surface/solid modeling, assembly design)","Reference: Client-provided images, publicly available APU dimensions from maintenance manuals or technical drawings","Validation: Dimensional comparison to known values; client review cycles for geometry approval"]',
   '["Portfolio-stated: ~90% geometric fidelity to original hardware (validation method: dimensional checks vs known measurements)","Client-accepted deliverable suitable for intended use; successful project completion within timeline"]',
   '["Develop automated reverse-engineering workflows using photogrammetry or 3D scanning integrated with CAD for aerospace legacy components","Investigate fidelity-cost tradeoffs: how much geometric detail is needed for accurate FEA or CFD of complex aerospace hardware?","Apply machine learning to infer hidden features (e.g., internal passages) from external geometry and functional constraints"]',
   '["Aerospace","CAD","Reverse Engineering","Surface Modeling","APU","SolidWorks"]', '["projects/honeywell-apu/apu-main.png","projects/honeywell-apu/apu-assembly.png","projects/honeywell-apu/apu-components.png"]',
   '', ''),
  ('piam-rover-wheel', 6, 'design',
   'PIAM 3D Space Rover Wheel', 'PIAM Competition', '2023', '',
   'Designed and optimized non-pneumatic rover wheel for space/harsh environment competition, achieving 1st place based on weight and deflection metrics.',
   '["Space rover wheels must operate in extreme environments (vacuum, temperature swings, abrasive regolith) without air-filled tires","Design challenge: minimize weight while maintaining stiffness and load-carrying capacity under specified deflection limits","Manufacturing constraint: must be 3D-printable with available materials and meet competition rules"]',
   '["Designed wheel geometry in SolidWorks: spoke pattern, rim structure, mounting interface for rover axle","Performed FEA to optimize for minimum weight under deflection constraints; iterated spoke topology for stiffness-to-weight ratio","Validated design via 3D printing and physical load testing (if performed); coordinated with competition team on integration"]',
   '["CAD: SolidWorks (parametric design for topology iterations)","FEA: Static structural analysis (ANSYS or SolidWorks Simulation); assumed vertical and lateral load cases per competition specs","3D Printing: Material selection (PLA, PETG, or nylon) based on availability and mechanical properties","Optimization: Manual or semi-automated iteration to minimize mass while meeting stiffness target"]',
   '["Measured: 1st place in competition based on weight/deflection metrics (official results)","Portfolio-stated: Specific weight and deflection values (exact numbers not provided in source material)","Design successfully manufactured via 3D printing and tested under competition load scenarios"]',
   '["Apply formal topology optimization (SIMP, level-set methods) for non-pneumatic wheel design under multiple load cases","Investigate multi-material printing strategies to achieve graded stiffness for impact absorption and terrain conformability","Develop FEA-validated models of wheel-terrain interaction for predicting traction and sinkage on granular surfaces"]',
   '["Rover","Non-Pneumatic Tire","FEA","Optimization","3D Printing","Competition","Space"]', '["projects/piam-rover-wheel/rover-wheel-main.png","projects/piam-rover-wheel/rover-wheel-cad.png","projects/piam-rover-wheel/rover-wheel-3dprint.png","projects/piam-rover-wheel/rover-wheel-testing.png","projects/piam-rover-wheel/rover-wheel-final.png"]',
   '', ''),
  ('cfd-f1-car', 7, 'design',
   'CFD Analysis — Formula 1 Car', 'Academic/Personal Project', '2023', '',
   'Aerodynamic CFD simulation of Formula 1 car to quantify drag, downforce, and flow features for educational and design insight purposes.',
   '["F1 aerodynamics are highly complex (multi-element wings, underbody, diffuser); understanding flow physics requires validated CFD approach","Challenge: balance computational cost (mesh resolution, turbulence model) with accuracy for capturing critical flow features (vortex, separation)","Goal: demonstrate CFD proficiency and generate design insights applicable to competition or academic projects"]',
   '["Prepared CAD geometry (simplified F1 car) for CFD meshing; defined computational domain and boundary conditions","Generated mesh (unstructured tetrahedral/polyhedral) with near-wall refinement for boundary layer resolution","Set up and ran CFD simulations in ANSYS Fluent: selected turbulence model (k-ω SST or k-ε), monitored convergence, post-processed results"]',
   '["CFD: ANSYS Fluent (steady RANS or transient if needed)","Meshing: ANSYS Meshing or ICEM CFD (inflation layers for y+ control, refinement zones for critical regions)","Turbulence model: k-ω SST (standard for external aero, captures separation and adverse pressure gradients)","Boundary conditions: Velocity inlet (representative F1 speed), pressure outlet, no-slip walls, symmetry plane; ground as moving wall for ground effect","Assumptions: Steady-state flow (no time-dependent effects), simplified geometry (no rotating wheels or moving suspension)"]',
   '["Portfolio-stated: Drag and downforce coefficients extracted; flow visualization (velocity, pressure contours, streamlines) generated","Identified key flow features: front wing vortex, underbody acceleration, diffuser expansion, rear wing separation behavior","Results provide baseline for design iteration or comparison studies (e.g., wing angle of attack sensitivity)"]',
   '["Develop reduced-order models (ROM) or surrogate models (Kriging, neural networks) for rapid aero optimization across design space","Investigate transient CFD or Detached Eddy Simulation (DES) to capture unsteady wake effects and vortex shedding","Couple CFD with structural analysis (fluid-structure interaction, FSI) to study aero-elastic effects on flexible wings"]',
   '["CFD","Aerodynamics","F1","ANSYS Fluent","Turbulence Modeling","External Flow"]', '["projects/cfd-f1-analysis/cfd-f1-main.png","projects/cfd-f1-analysis/cfd-f1-pressure.png","projects/cfd-f1-analysis/cfd-f1-velocity.png"]',
   '', ''),
  ('cfd-kenworth-t800', 8, 'design',
   'CFD Analysis — Kenworth T800 Commercial Truck', 'Academic/Personal Project', '2023', '',
   'External aerodynamic CFD study of Kenworth T800 truck to quantify drag reduction strategies for fuel efficiency improvement.',
   '["Commercial trucks are major fuel consumers; aerodynamic drag is dominant resistance at highway speeds (fuel cost and emissions impact)","Challenge: model realistic truck geometry (cab, trailer gap, underbody, wheels) and predict drag with acceptable accuracy","Goal: evaluate drag reduction devices (cab fairings, side skirts, boat tails) and quantify fuel savings potential"]',
   '["Prepared CAD model of Kenworth T800 (simplified or detailed as appropriate) for CFD analysis","Generated computational mesh with refinement in wake region and near body; defined boundary conditions (inlet velocity, outlet pressure, moving ground)","Ran CFD simulations in ANSYS Fluent; post-processed drag coefficient, pressure distribution, and wake structure"]',
   '["CFD: ANSYS Fluent (steady-state RANS)","Turbulence model: k-ε Realizable or k-ω SST (appropriate for bluff body external aero)","Meshing: Polyhedral mesh with prism layers for boundary layer; refinement boxes in wake region to capture recirculation","Boundary conditions: Highway speed inlet (~25 m/s), pressure outlet, no-slip walls, moving ground to simulate road; crosswind if studied","Assumptions: Steady-state flow (no transient gusts); simplified underbody (no detailed suspension); no rotating wheels initially (or MRF/sliding mesh if included)"]',
   '["Portfolio-stated: Baseline drag coefficient quantified; wake structure (recirculation zones, vortex streets) visualized","Comparison of configurations (e.g., with/without fairings) to estimate percentage drag reduction","Results applicable to fuel economy estimation: drag reduction translates to ~1% fuel savings per ~2% drag reduction (industry rule of thumb)"]',
   '["Validate CFD against wind tunnel or coast-down test data for heavy trucks; quantify uncertainty in drag prediction","Investigate optimization of add-on devices (fairing shape, trailer gap) using adjoint methods or genetic algorithms","Study crosswind stability and transient aerodynamics (passing maneuvers, gusts) via time-dependent simulations or LES"]',
   '["CFD","Aerodynamics","Commercial Truck","ANSYS Fluent","Drag Reduction","Fuel Efficiency"]', '["projects/cfd-kenworth-t800/cfd-truck-main.png","projects/cfd-kenworth-t800/cfd-truck-flow.png","projects/cfd-kenworth-t800/cfd-truck-drag.png"]',
   '', ''),
  ('heat-exchanger-cfd', 9, 'design',
   'Heat Exchanger CFD Analysis', 'Academic/Personal Project', '2023', '',
   'Conjugate heat transfer CFD simulation of heat exchanger to optimize thermal performance and pressure drop for cooling system applications.',
   '["Heat exchangers are critical in thermal management (HVAC, power electronics, engines); design must balance heat transfer rate vs pressure drop","Challenge: model conjugate heat transfer (fluid + solid) with accurate turbulence and near-wall effects in complex fin/tube geometry","Goal: predict effectiveness (ε) or NTU, optimize fin geometry or flow arrangement, validate against analytical correlations"]',
   '["Created or obtained CAD model of heat exchanger (plate-fin, tube-fin, or shell-and-tube); prepared geometry for meshing","Generated mesh with boundary layer resolution at fluid-solid interfaces; assigned material properties (fluid, solid)","Set up conjugate heat transfer simulation in ANSYS Fluent: defined inlet conditions (mass flow, temperature), outlet pressure, wall thermal conditions"]',
   '["CFD: ANSYS Fluent (conjugate heat transfer, steady-state or transient)","Turbulence model: k-ε or k-ω SST (depending on flow regime and geometry)","Meshing: Conformal mesh at fluid-solid interface; inflation layers for boundary layer capture; refinement in high-gradient regions","Boundary conditions: Hot and cold side inlet velocities/temperatures, pressure outlets, adiabatic or convective outer walls","Assumptions: Incompressible flow (if low Mach), steady-state thermal conditions, negligible radiation (if T not too high)"]',
   '["Portfolio-stated: Heat transfer rate (Q) and pressure drop (ΔP) quantified; effectiveness or NTU calculated from outlet temperatures","Temperature and velocity contours visualized to identify hotspots and flow mal-distribution","Comparison to analytical correlations (ε-NTU method, Colburn j-factor, friction factor) validates CFD setup"]',
   '["Optimize fin geometry (spacing, thickness, louvered vs plain) using adjoint-based or parametric optimization for max Q/ΔP ratio","Investigate advanced geometries (3D-printed lattice structures, micro-channels) for enhanced heat transfer","Study transient response (thermal inertia) and control strategies for dynamic loads (e.g., battery thermal management)"]',
   '["CFD","Heat Exchanger","Thermal Management","Conjugate Heat Transfer","ANSYS Fluent","Optimization"]', '["projects/heat-exchanger-cfd/heat-exchanger-main.png","projects/heat-exchanger-cfd/heat-exchanger-flow.png","projects/heat-exchanger-cfd/heat-exchanger-temp.png"]',
   '', ''),
  ('rack-pinion-steering', 10, 'design',
   'Rack & Pinion Steering Assembly', 'Academic/Personal Project', '2022', '',
   'Mechanical design and kinematic analysis of rack and pinion steering system for automotive application with focus on geometry and manufacturability.',
   '["Steering systems must translate rotational driver input to linear wheel motion with appropriate ratio, minimizing play and maximizing durability","Design challenge: balance rack travel, pinion size, and gear ratio to meet vehicle turning radius and driver effort requirements","Manufacturing consideration: ensure proper tooth profile (pressure angle, module) and material selection for wear resistance"]',
   '["Designed rack and pinion assembly in SolidWorks: pinion gear, rack bar, housing, tie rods, mounting brackets","Performed kinematic analysis to verify steering ratio and Ackermann geometry for proper wheel angle relationship","Applied GD&T for gear meshing tolerances and assembly clearances; selected materials for gears (e.g., case-hardened steel)"]',
   '["CAD: SolidWorks (gear toolbox for pinion, linear pattern for rack teeth, assembly mates for motion simulation)","Kinematics: SolidWorks Motion or hand calculations to verify steering ratio (degrees rotation per inch of rack travel)","Standards: AGMA gear design standards for pressure angle (typically 20°), module selection, and contact ratio","Assumptions: Static loading (no dynamic FEA); material properties from standards; assumed steering input torque from vehicle class"]',
   '["Functional steering assembly design meeting target steering ratio and geometric constraints","Ackermann geometry validated: inner and outer wheel angles calculated for turning radius compliance","Design suitable for prototype manufacturing or further FEA/experimental validation"]',
   '["Investigate advanced steering systems: steer-by-wire (SBW) with force feedback control and redundancy for autonomous vehicles","Develop FEA-based contact stress analysis (Hertzian contact) and wear prediction for rack-pinion interface under cyclic loading","Study multi-body dynamics (MBD) of complete steering linkage including suspension compliance and road inputs"]',
   '["Steering","Rack and Pinion","Mechanical Design","Kinematics","GD&T","SolidWorks"]', '["projects/rack-pinion-steering/steering-main.png","projects/rack-pinion-steering/steering-assembly.png","projects/rack-pinion-steering/steering-mechanism.png"]',
   '', ''),
  ('hybrid-tire-research', 11, 'research',
   'Hybrid Tire Technology vs Non‑Pneumatic Tires (NPTs)', 'Research Project / Submitted Paper', '2023–2024', '',
   'FEA-based design and comparative analysis of hybrid tire concept aiming to combine puncture-free benefits of NPTs with improved comfort and weight performance.',
   '["Non-pneumatic tires (NPTs) eliminate puncture risk but suffer from weight penalties and ride harshness compared to conventional pneumatic tires","Research gap: can a hybrid design (combining air chamber with resilient spokes) achieve puncture resistance with acceptable weight and ride quality?","Validation challenge: experimental tire testing is expensive; FEA must be carefully validated to predict load-deflection and contact behavior"]',
   '["Proposed hybrid tire design concept; created CAD models of hybrid and NPT configurations in SolidWorks","Set up FEA in ANSYS: static structural analysis with contact modeling (tire-ground interface), hyperelastic material models for rubber","Performed parametric studies on spoke geometry, material selection (polyurethane composite), and internal air pressure","Compared performance metrics (weight, deflection, contact pressure, ride comfort proxy) vs NPT baseline"]',
   '["CAD: SolidWorks (parametric tire geometry: tread, sidewall, spoke pattern)","FEA: ANSYS Mechanical (static structural, large deformation, hyperelastic material models such as Mooney-Rivlin or Ogden for rubber)","Contact: Augmented Lagrangian or penalty-based contact between tire and rigid ground; friction coefficient assumed","Boundary conditions: Vertical load (representative vehicle weight), inflation pressure (for hybrid), ground constraint, rim fixed DOF","Assumptions: Quasi-static loading (no dynamic rolling analysis); material properties from literature or vendor data; simplified tread pattern"]',
   '["Portfolio-stated: Hybrid tire achieved ~30% weight reduction vs NPT while maintaining load capacity","Portfolio-stated: Improved impact integrity and deflection characteristics compared to NPT (specific metrics not fully detailed in source)","FEA results submitted in research paper (under review per CV); awaiting peer-review feedback"]',
   '["Validate FEA predictions via experimental testing: load-deflection curves, rolling resistance, impact drop tests","Develop rolling contact FEA (explicit dynamics or steady-state transport) to predict rolling resistance and heat generation","Investigate multi-material optimization: graded stiffness spokes or composite tread for tailored performance","Study durability: fatigue life prediction of spokes under cyclic loading via stress-life or strain-life methods"]',
   '["Tire Mechanics","FEA","Hyperelastic","Non-Pneumatic Tire","Design Verification","Research","ANSYS"]', '["projects/hybrid-tire-research/tire-main.png","projects/hybrid-tire-research/tire-design.png","projects/hybrid-tire-research/tire-fea.png","projects/hybrid-tire-research/tire-comparison.png","projects/hybrid-tire-research/tire-results.png"]',
   'Published', 'https://www.researchgate.net/publication/381123426_Design_Analysis_and_Comparison_of_Hybrid_and_Non-Pneumatic_Tires'),
  ('gfrp-insulator-thesis', 12, 'research',
   'GFRP Composite Insulators for HV Power Transmission', 'Thesis / Industry R&D', '2024–2025', '',
   'Design, manufacturing, and experimental validation of GFRP composite insulators for overhead high-voltage lines with focus on replacing ceramic insulators.',
   '["Ceramic insulators are brittle, heavy, and prone to catastrophic failure; GFRP composites offer lighter, tougher alternatives with superior contamination resistance","Design challenge: meet electrical (leakage current, flashover voltage) and mechanical (tensile, bending, torsion) standards under harsh environmental conditions","Manufacturing challenge: establish pultrusion and hand lay-up lines suitable for insulator geometry; ensure quality control and reproducibility"]',
   '["Led design of GFRP insulator geometry (core rod, weather sheds) in SolidWorks; selected E-glass fiber, epoxy resin, and fillers","Set up manufacturing line: pultrusion for core rod, hand lay-up for sheds; developed process parameters (cure temperature, fiber volume fraction)","Conducted experimental testing: tensile, 3-point bending, electrical (wet/dry flashover, leakage current), hydrophobicity (contact angle)","Performed FEA validation in Abaqus: composite material models (orthotropic properties), correlation to test data"]',
   '["Manufacturing: Pultrusion (unidirectional fiber, epoxy matrix) for rod; hand lay-up (woven fabric) for sheds","Testing standards: IEC 61109 (composite insulators), ASTM D638 (tensile), ASTM D790 (flexural), IEC 60507 (pollution flashover)","FEA: Abaqus (composite layup module, progressive damage models if implemented), correlation to mechanical test results","Characterization: SEM (fiber-matrix interface), contact angle goniometry (hydrophobicity), electrical breakdown (high-voltage lab)"]',
   '["Measured: Tensile and bending strength meeting IEC 61109 requirements (specific values in thesis/paper)","Measured: Electrical performance (flashover voltage, leakage current) comparable or superior to ceramic baseline under pollution conditions","Portfolio-stated: Claimed improvements over ceramic (longer service life, reduced failure incidents); quantified data in progress for publication","Manufacturing process validated for repeatability; produced functional prototypes for field trial consideration"]',
   '["Investigate long-term aging mechanisms: UV degradation, hydrothermal cycling, electrical tracking; develop accelerated life models","Optimize fiber architecture (3D woven, braided) and hybrid composites (glass-carbon, nanofillers) for enhanced mechanical and electrical properties","Develop multi-physics FEA: coupled electrical-thermal-mechanical analysis to predict flashover under contamination and moisture","Study environmental impact: lifecycle assessment (LCA) comparing GFRP vs ceramic insulators (manufacturing energy, end-of-life recycling)"]',
   '["Composites","GFRP","Pultrusion","Electrical Insulation","Standards Testing","Abaqus","Research","Thesis"]', '["projects/gfrp-insulators/insulator-main.png","projects/gfrp-insulators/insulator-composite.png","projects/gfrp-insulators/insulator-testing.png","projects/gfrp-insulators/insulator-final.png"]',
   'Submitted', '')
ON CONFLICT (id) DO NOTHING;

-- ── 4. STORAGE BUCKET ──────────────────────────────────────
-- Run this in the SQL editor (storage API is available via SQL).

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-files', 'portfolio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to all files in the bucket
DROP POLICY IF EXISTS "Public read portfolio-files"  ON storage.objects;
DROP POLICY IF EXISTS "Auth upload portfolio-files"  ON storage.objects;
DROP POLICY IF EXISTS "Auth update portfolio-files"  ON storage.objects;
DROP POLICY IF EXISTS "Auth delete portfolio-files"  ON storage.objects;

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
