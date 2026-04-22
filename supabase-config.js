// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
// 1. Create a free project at https://supabase.com
// 2. Go to: Project Settings → API
// 3. Copy your Project URL and anon/public key and paste them below.
// 4. Run the SQL in supabase-setup.sql inside Supabase → SQL Editor.
// 5. Re-deploy your site.
// ============================================================

const SUPABASE_URL  = 'https://gnnomcyaszzkmwpdikor.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_URdcfrMqZ_RtcI64O1xMrQ_9O2POAf2';

// ── DO NOT EDIT BELOW THIS LINE ────────────────────────────
(function initSupabase() {
  const configured =
    SUPABASE_URL  !== 'https://YOUR_PROJECT_ID.supabase.co' &&
    SUPABASE_ANON_KEY !== 'your-anon-public-key-here';

  if (!configured) {
    console.info('[Supabase] Not configured — site runs in static-only mode.');
    return;
  }

  if (typeof window.supabase === 'undefined') {
    console.warn('[Supabase] SDK not loaded yet. Make sure the CDN script comes before supabase-config.js.');
    return;
  }

  try {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('[Supabase] Client initialised.');
  } catch (e) {
    console.error('[Supabase] Failed to initialise client:', e.message);
  }
})();
