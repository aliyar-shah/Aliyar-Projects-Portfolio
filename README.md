# Aliyar PhD Portfolio Website (Static)

## What you got
- A single-page static site (index.html + app.js) that loads content from `content/projects.json`.
- CV embedded + downloadable.
- Two portfolios (Design / Research) + project detail pages.
- All assets (PDFs + rendered project pages) inside `/assets`.
- **Admin dashboard** (`admin.html`) — upload/update your profile photo, CV, and portfolio documents directly from the browser.
- **Thematic interactive copy** (`makeup.html` + `makeup.css` + `makeup-effects.js`) with a separate admin entry (`makeup-admin.html`) that uses the same Supabase-backed editing controls.

## How to edit / add projects (no complex coding)
1) Open `content/projects.json`
2) Duplicate an existing project object and change:
   - `id` (unique, use kebab-case)
   - `category`: "design" or "research"
   - `title`, `subtitle`, `period`, `tags`
   - `heroImage`: put an image file in `/assets` and reference it here
   - `what`, `how`, `results` arrays
   - `links` array (label + url)
3) Save. Re-deploy the site.

### Adding images
- Put PNG/JPG in `/assets`.
- Update the project's `heroImage` to match the filename.

---

## Admin Dashboard — Direct Upload Setup

The admin dashboard lets you upload your profile photo and documents directly from the browser without touching any files. It uses [Supabase](https://supabase.com) (free tier) for authentication, file storage, and metadata.

### Step 1 — Create a Supabase project
1. Go to <https://supabase.com> and sign up (free).
2. Create a new project (choose any region/password).
3. Wait ~1 minute for the project to be ready.

### Step 2 — Run the database setup
1. In your Supabase project, go to **SQL Editor → New Query**.
2. Paste the entire contents of `supabase-setup.sql` and click **Run**.
3. You should see "Success. No rows returned."
4. You can re-run the same SQL file later to apply safe schema updates (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) without recreating your database.

### Step 3 — Fill in your credentials
1. In Supabase, go to **Project Settings → API**.
2. Copy your **Project URL** and **anon / public** key.
3. For the main site (`index.html` / `admin.html`), edit `supabase-config-main.js`.
4. For the redesign/thematic site (`makeup.html` / `makeup-admin.html`), edit `supabase-config-redesign.js`.
5. Replace the placeholder values:
   ```js
   const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = '******';
   ```

### Step 4 — Create your admin account
1. In Supabase, go to **Authentication → Users → Add user**.
2. Enter your email and a strong password.
3. Click **Create user**.

### Step 5 — Re-deploy the site
Push your changes to GitHub. GitHub Pages / Netlify will pick up the updated files automatically.

### Step 6 — Use the dashboard
1. Open `https://your-site.com/admin.html`.
2. Sign in with the email/password you created in Step 4.
3. Upload your profile photo, CV, Portfolio PDF, or Research PDF from the **Profile** and **Documents** tabs.

> **Security note:** The anon/public key is safe to commit, but never expose a `service_role` key in frontend files. Supabase Row-Level Security policies (installed by `supabase-setup.sql`) ensure only authenticated admin users can write data while the public can read.

### Separate Supabase + Runtime for redesign (recommended)
Use this when you want the redesign on a fully separate backend/runtime while keeping the current live site unchanged.

1. Create a second Supabase project in the same org for redesign.
2. Run `supabase-setup.sql` in that new project.
3. Recreate storage bucket(s), RLS policies, and auth provider/redirect settings in the new project.
4. Put redesign project credentials in `supabase-config-redesign.js`.
5. Keep main project credentials in `supabase-config-main.js`.
6. Create a separate deployment target (new Netlify/Vercel project) connected to the same GitHub repo.
7. Set branch flow:
   - `main` branch → main runtime + `supabase-config-main.js`
   - `redesign` branch (or equivalent) → redesign runtime + `supabase-config-redesign.js`
8. Before go-live, verify:
   - Admin auth/login works
   - Reads/writes are hitting the intended Supabase project
   - Storage uploads/downloads work
   - Unauthorized writes are blocked by RLS
9. Optional safe launch: use a subdomain (e.g. `new.yourdomain.com`) for redesign, then switch primary domain when ready.

---

## How to host (fast + free)
### Option A (recommended): GitHub + Netlify
1) Create a GitHub repo and push all files.
2) Netlify: New site from Git -> select repo -> build command: (none) -> publish directory: (root)
3) Netlify will give you a URL. Add a custom domain later if you want.

### Option B: GitHub Pages
1) Push to repo
2) Settings -> Pages -> Deploy from branch -> root
3) Site will be available at https://<username>.github.io/<repo>/

## Visitor tracking (analytics)
- Easiest: Google Analytics 4 (free).
  1) Create a GA4 property, copy Measurement ID like `G-ABC123...`
  2) Open `index.html`
  3) Uncomment the analytics scripts and paste your Measurement ID.
- Alternative: Plausible (paid) or Cloudflare Web Analytics (free-ish, privacy-friendly).

## Disclaimer
Some results in the original PDFs are written as claims. For PhD reviewers, add evidence:
- test setup, assumptions, plots, standards, public patent numbers, acceptance letters, etc.
