// ============================================================
// ADMIN DASHBOARD — Syed Aliyar Shah Portfolio
// ============================================================
// Requires supabase-config.js (loaded before this file)
// Uses Supabase Auth + Storage + DB for upload/update flows.
// ============================================================

const STORAGE_BUCKET = 'portfolio-files';

// ── Utility helpers ─────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    if (ch == null) continue;
    node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

function showAlert(alertEl, message, type = 'info') {
  alertEl.textContent = message;
  alertEl.className = `admin-alert show ${type}`;
}

function hideAlert(alertEl) {
  alertEl.className = 'admin-alert';
}

function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Please wait…';
  } else {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Validation ───────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];
const MAX_IMAGE_SIZE       = 5 * 1024 * 1024;   // 5 MB
const MAX_DOC_SIZE         = 20 * 1024 * 1024;  // 20 MB

function validateFile(file, type) {
  // type: 'image' | 'document'
  const allowed = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;

  if (!allowed.includes(file.type)) {
    const ext = type === 'image' ? 'PNG / JPEG / WEBP' : 'PDF';
    return `Invalid file type. Only ${ext} files are allowed.`;
  }
  if (file.size > maxSize) {
    return `File too large. Maximum size is ${formatBytes(maxSize)}.`;
  }
  return null; // valid
}

// ── Supabase wrappers ────────────────────────────────────────

async function uploadFile(storagePath, file, onProgress) {
  const client = window.supabaseClient;

  // Supabase JS v2 does not expose a progress callback on upload,
  // so we simulate a progress update when the upload resolves.
  if (onProgress) onProgress(30);

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);
  if (onProgress) onProgress(100);

  const { data: urlData } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function saveProfileRow(updates) {
  const { error } = await window.supabaseClient
    .from('profile')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 'main');
  if (error) throw new Error(error.message);
}

async function saveDocumentRow(id, updates) {
  const { error } = await window.supabaseClient
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function fetchProfile() {
  const { data, error } = await window.supabaseClient
    .from('profile')
    .select('*')
    .eq('id', 'main')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchDocuments() {
  const { data, error } = await window.supabaseClient
    .from('documents')
    .select('*');
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Login screen ─────────────────────────────────────────────

function renderLogin(root) {
  const alert = el('div', { class: 'admin-alert' });

  const emailInput    = el('input', { class: 'admin-input', type: 'email',    placeholder: 'admin@example.com', id: 'login-email' });
  const passwordInput = el('input', { class: 'admin-input', type: 'password', placeholder: 'Password',          id: 'login-password' });
  const loginBtn      = el('button', { class: 'admin-btn primary admin-btn-full', type: 'button' }, 'Sign In');

  loginBtn.addEventListener('click', async () => {
    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showAlert(alert, 'Please enter your email and password.', 'error');
      return;
    }

    setButtonLoading(loginBtn, true, 'Sign In');
    hideAlert(alert);

    try {
      const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      // Successful login — re-render as dashboard
      root.innerHTML = '';
      await renderDashboard(root);
      document.getElementById('logoutBtn').style.display = '';
    } catch (e) {
      showAlert(alert, `Login failed: ${e.message}`, 'error');
      setButtonLoading(loginBtn, false, 'Sign In');
    }
  });

  // Also submit on Enter key
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  root.appendChild(
    el('div', { class: 'admin-login-wrap' },
      el('div', { class: 'admin-login-card card' },
        el('div', { class: 'admin-section-icon' }, '🔐'),
        el('h1', {}, 'Admin Login'),
        el('p', { class: 'admin-subtitle' }, 'Sign in to manage your portfolio content.'),
        alert,
        el('div', { class: 'admin-field' },
          el('label', { for: 'login-email' }, 'Email'),
          emailInput
        ),
        el('div', { class: 'admin-field' },
          el('label', { for: 'login-password' }, 'Password'),
          passwordInput
        ),
        loginBtn
      )
    )
  );
}

// ── Upload section builder ────────────────────────────────────

function buildUploadSection({ title, desc, storagePath, acceptType, fileType, currentUrl, onSaved }) {
  const isImage = fileType === 'image';
  const acceptAttr = isImage ? 'image/png,image/jpeg,image/webp' : 'application/pdf';
  const hint = isImage
    ? 'PNG, JPEG or WEBP · Max 5 MB'
    : 'PDF only · Max 20 MB';

  const alert        = el('div', { class: 'admin-alert' });
  const progressWrap = el('div', { class: 'upload-progress' });
  const progressBar  = el('div', { class: 'progress-bar' });
  const progressLbl  = el('div', { class: 'progress-label' }, 'Uploading…');
  progressWrap.appendChild(progressLbl);
  progressWrap.appendChild(el('div', { class: 'progress-bar-wrap' }, progressBar));

  // Current file display
  let currentFileEl = null;
  if (currentUrl) {
    const shortName = decodeURIComponent(currentUrl.split('/').pop());
    currentFileEl = el('div', { class: 'current-file' },
      el('span', {}, '✅ Current: '),
      el('a', { href: currentUrl, target: '_blank', rel: 'noreferrer' }, shortName)
    );
  }

  // File input + drag-drop zone
  const fileInput = el('input', { type: 'file', accept: acceptAttr });
  const previewEl = el('div', { class: 'upload-preview' });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const err = validateFile(file, fileType);
    if (err) {
      showAlert(alert, err, 'error');
      fileInput.value = '';
      previewEl.className = 'upload-preview';
      return;
    }
    hideAlert(alert);

    previewEl.innerHTML = '';
    previewEl.className = 'upload-preview show';
    if (isImage) {
      // URL.createObjectURL always returns a safe blob: URL — no XSS risk
      const blobUrl = URL.createObjectURL(file);
      const img = el('img', { class: 'preview-img', alt: 'Preview' });
      img.setAttribute('src', blobUrl);
      previewEl.appendChild(img);
    } else {
      // Display filename as text via createTextNode (safe — no innerHTML)
      const safeFileName = file.name.replace(/[<>&"']/g, '');
      previewEl.appendChild(
        el('div', { class: 'preview-file-info' },
          el('span', { class: 'preview-file-icon' }, '📄'),
          el('span', {}, `${safeFileName} — ${formatBytes(file.size)}`)
        )
      );
    }
  });

  const uploadArea = el('div', { class: 'upload-area' },
    fileInput,
    el('div', { class: 'upload-icon' }, isImage ? '🖼️' : '📄'),
    el('div', { class: 'upload-label' }, 'Click to choose a file, or drag & drop here'),
    el('div', { class: 'upload-hint' }, hint)
  );

  // Drag-and-drop highlight
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      // Assign to file input so the change handler runs
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  const uploadBtn = el('button', { class: 'admin-btn primary', type: 'button', style: 'margin-top:14px' }, '⬆️  Upload & Save');

  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      showAlert(alert, 'Please select a file first.', 'error');
      return;
    }
    const validErr = validateFile(file, fileType);
    if (validErr) { showAlert(alert, validErr, 'error'); return; }

    setButtonLoading(uploadBtn, true, '⬆️  Upload & Save');
    hideAlert(alert);
    progressWrap.className = 'upload-progress show';
    progressBar.style.width = '10%';

    try {
      const publicUrl = await uploadFile(storagePath, file, (pct) => {
        progressBar.style.width = `${pct}%`;
      });

      await onSaved(publicUrl);

      progressBar.style.width = '100%';
      showAlert(alert, '✅  Saved successfully! The change will appear on the public site immediately.', 'success');

      // Refresh current-file display
      if (currentFileEl) {
        const shortName = decodeURIComponent(publicUrl.split('/').pop());
        currentFileEl.innerHTML = '';
        currentFileEl.appendChild(document.createTextNode('✅ Current: '));
        currentFileEl.appendChild(el('a', { href: publicUrl, target: '_blank', rel: 'noreferrer' }, shortName));
      }

      // Reset form
      fileInput.value = '';
      previewEl.className = 'upload-preview';
    } catch (e) {
      showAlert(alert, `Upload failed: ${e.message}`, 'error');
      progressWrap.className = 'upload-progress';
    } finally {
      setButtonLoading(uploadBtn, false, '⬆️  Upload & Save');
    }
  });

  const children = [
    el('h2', {}, title),
    el('p', { class: 'admin-section-desc' }, desc),
  ];
  if (currentFileEl) children.push(currentFileEl);
  children.push(uploadArea, previewEl, progressWrap, alert, uploadBtn);

  return el('div', { class: 'admin-section card' }, ...children);
}

// ── Profile metadata form ─────────────────────────────────────

function buildProfileMetaForm(profile) {
  const alert     = el('div', { class: 'admin-alert' });
  const nameInput = el('input', { class: 'admin-input', type: 'text', value: profile.name  || '', placeholder: 'Full name' });
  const titleInput = el('input', { class: 'admin-input', type: 'text', value: profile.title || '', placeholder: 'Job title / tagline' });
  const saveBtn   = el('button', { class: 'admin-btn primary', type: 'button' }, '💾  Save Profile Info');

  saveBtn.addEventListener('click', async () => {
    const name  = nameInput.value.trim();
    const title = titleInput.value.trim();
    if (!name) { showAlert(alert, 'Name cannot be empty.', 'error'); return; }

    setButtonLoading(saveBtn, true, '💾  Save Profile Info');
    hideAlert(alert);

    try {
      await saveProfileRow({ name, title });
      showAlert(alert, '✅  Profile info saved successfully!', 'success');
    } catch (e) {
      showAlert(alert, `Save failed: ${e.message}`, 'error');
    } finally {
      setButtonLoading(saveBtn, false, '💾  Save Profile Info');
    }
  });

  return el('div', { class: 'admin-section card' },
    el('h2', {}, 'Profile Information'),
    el('p', { class: 'admin-section-desc' }, 'Update your name and headline that appear on the home page.'),
    el('div', { class: 'admin-field' },
      el('label', {}, 'Full Name'),
      nameInput
    ),
    el('div', { class: 'admin-field' },
      el('label', {}, 'Title / Headline'),
      titleInput
    ),
    alert,
    saveBtn
  );
}

// ── Document meta form (title / subtitle) ────────────────────

function buildDocMetaForm(doc) {
  const alert        = el('div', { class: 'admin-alert' });
  const titleInput    = el('input', { class: 'admin-input', type: 'text', value: doc.title    || '', placeholder: 'Document title' });
  const subtitleInput = el('input', { class: 'admin-input', type: 'text', value: doc.subtitle || '', placeholder: 'Short description' });
  const saveBtn      = el('button', { class: 'admin-btn primary', type: 'button' }, '💾  Save Labels');

  saveBtn.addEventListener('click', async () => {
    const title    = titleInput.value.trim();
    const subtitle = subtitleInput.value.trim();
    if (!title) { showAlert(alert, 'Title cannot be empty.', 'error'); return; }

    setButtonLoading(saveBtn, true, '💾  Save Labels');
    hideAlert(alert);
    try {
      await saveDocumentRow(doc.id, { title, subtitle });
      showAlert(alert, '✅  Labels saved!', 'success');
    } catch (e) {
      showAlert(alert, `Save failed: ${e.message}`, 'error');
    } finally {
      setButtonLoading(saveBtn, false, '💾  Save Labels');
    }
  });

  return el('div', { class: 'admin-section card' },
    el('h2', {}, 'Document Labels'),
    el('p', { class: 'admin-section-desc' }, 'These titles appear on the Download Centre card for this document.'),
    el('div', { class: 'admin-field' },
      el('label', {}, 'Title'),
      titleInput
    ),
    el('div', { class: 'admin-field' },
      el('label', {}, 'Subtitle'),
      subtitleInput
    ),
    alert,
    saveBtn
  );
}

// ── Dashboard ─────────────────────────────────────────────────

async function renderDashboard(root) {
  // Load current data
  let profile   = { name: 'Syed Aliyar Shah', title: 'Mechanical Design & Simulation Engineer', photo_url: null };
  let documents = [];

  try {
    profile   = await fetchProfile();
    documents = await fetchDocuments();
  } catch (e) {
    console.error('Failed to load dashboard data:', e.message);
  }

  const docMap = {};
  documents.forEach(d => { docMap[d.id] = d; });

  const cv        = docMap['cv']        || { id: 'cv',        title: 'Curriculum Vitae',          subtitle: '', file_url: null };
  const portfolio = docMap['portfolio'] || { id: 'portfolio', title: 'Design Projects Portfolio',  subtitle: '', file_url: null };
  const research  = docMap['research']  || { id: 'research',  title: 'Research & Publications',    subtitle: '', file_url: null };

  // ── Tab definitions ─────────────────────────────────────────
  const tabs = [
    { id: 'profile',   label: '👤 Profile' },
    { id: 'documents', label: '📄 Documents' },
  ];

  const tabBtns  = [];
  const tabPanels = {};

  const tabBar = el('div', { class: 'admin-tabs' });
  const tabContent = el('div', { class: 'admin-tab-content' });

  function switchTab(id) {
    tabBtns.forEach(b  => b.classList.toggle('active', b.dataset.tab === id));
    Object.entries(tabPanels).forEach(([k, p]) => p.classList.toggle('active', k === id));
  }

  tabs.forEach(t => {
    const btn = el('button', { class: 'admin-tab', type: 'button', 'data-tab': t.id }, t.label);
    btn.addEventListener('click', () => switchTab(t.id));
    tabBtns.push(btn);
    tabBar.appendChild(btn);
  });

  // ── Profile tab ──────────────────────────────────────────────
  const profilePanel = el('div', { class: 'admin-panel', id: 'panel-profile' });

  profilePanel.appendChild(buildProfileMetaForm(profile));

  profilePanel.appendChild(buildUploadSection({
    title:       'Profile Photo',
    desc:        'Upload a professional photo (PNG/JPEG/WEBP, max 5 MB). It will replace the photo on the home page immediately.',
    storagePath: 'profile/profile-photo',
    acceptType:  'image/*',
    fileType:    'image',
    currentUrl:  profile.photo_url || null,
    onSaved:     async (url) => { await saveProfileRow({ photo_url: url }); }
  }));

  tabPanels['profile'] = profilePanel;
  tabContent.appendChild(profilePanel);

  // ── Documents tab ────────────────────────────────────────────
  const docsPanel = el('div', { class: 'admin-panel', id: 'panel-documents' });

  // CV
  docsPanel.appendChild(buildUploadSection({
    title:       'Curriculum Vitae (CV)',
    desc:        'Upload a new PDF to replace the CV shown in the CV page and Download Centre. The old file is overwritten automatically.',
    storagePath: 'documents/cv.pdf',
    acceptType:  'application/pdf',
    fileType:    'document',
    currentUrl:  cv.file_url || null,
    onSaved:     async (url) => { await saveDocumentRow('cv', { file_url: url }); }
  }));

  docsPanel.appendChild(buildDocMetaForm(cv));

  docsPanel.appendChild(el('hr', { class: 'sep' }));

  // Portfolio PDF
  docsPanel.appendChild(buildUploadSection({
    title:       'Design Projects Portfolio PDF',
    desc:        'Upload a new PDF to replace the Design Portfolio document.',
    storagePath: 'documents/portfolio.pdf',
    acceptType:  'application/pdf',
    fileType:    'document',
    currentUrl:  portfolio.file_url || null,
    onSaved:     async (url) => { await saveDocumentRow('portfolio', { file_url: url }); }
  }));

  docsPanel.appendChild(buildDocMetaForm(portfolio));

  docsPanel.appendChild(el('hr', { class: 'sep' }));

  // Research PDF
  docsPanel.appendChild(buildUploadSection({
    title:       'Research & Publications PDF',
    desc:        'Upload a new PDF to replace the Research document.',
    storagePath: 'documents/research.pdf',
    acceptType:  'application/pdf',
    fileType:    'document',
    currentUrl:  research.file_url || null,
    onSaved:     async (url) => { await saveDocumentRow('research', { file_url: url }); }
  }));

  docsPanel.appendChild(buildDocMetaForm(research));

  tabPanels['documents'] = docsPanel;
  tabContent.appendChild(docsPanel);

  // ── Assemble ─────────────────────────────────────────────────
  root.appendChild(
    el('div', { class: 'admin-header' },
      el('h1', {}, '⚙️  Admin Dashboard'),
      el('p', {}, 'Manage your portfolio content. Changes go live on the public site immediately.')
    )
  );
  root.appendChild(tabBar);
  root.appendChild(tabContent);

  // Activate first tab
  switchTab('profile');
}

// ── Not-configured screen ─────────────────────────────────────

function renderNotConfigured(root) {
  root.appendChild(
    el('div', { class: 'admin-not-configured card' },
      el('div', { class: 'big-icon' }, '⚠️'),
      el('h2', {}, 'Supabase Not Configured'),
      el('p', {},
        'To use the admin dashboard, open ',
        el('code', {}, 'supabase-config.js'),
        ' and replace the placeholder URL and anon key with your Supabase project credentials. ',
        'Then run the SQL in ',
        el('code', {}, 'supabase-setup.sql'),
        ' and re-deploy the site.'
      ),
      el('a', { class: 'admin-btn primary', href: 'https://supabase.com', target: '_blank', rel: 'noreferrer' },
        '🚀  Create a free Supabase project'
      )
    )
  );
}

// ── Entry point ───────────────────────────────────────────────

(async function initAdmin() {
  const root      = document.getElementById('adminApp');
  const logoutBtn = document.getElementById('logoutBtn');

  // Supabase not configured
  if (!window.supabaseClient) {
    renderNotConfigured(root);
    return;
  }

  // Logout handler
  logoutBtn.addEventListener('click', async () => {
    await window.supabaseClient.auth.signOut();
    logoutBtn.style.display = 'none';
    root.innerHTML = '';
    renderLogin(root);
  });

  // Check existing session
  const { data: { session } } = await window.supabaseClient.auth.getSession();

  if (session) {
    logoutBtn.style.display = '';
    await renderDashboard(root);
  } else {
    renderLogin(root);
  }
})();
