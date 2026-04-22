// ============================================================
// ADMIN DASHBOARD — Syed Aliyar Shah Portfolio
// ============================================================
// Requires supabase-config.js loaded before this file.
// ============================================================

const STORAGE_BUCKET = 'portfolio-files';

// ── Utilities ─────────────────────────────────────────────────

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
function hideAlert(alertEl) { alertEl.className = 'admin-alert'; }

function setButtonLoading(btn, loading, originalText) {
  if (loading) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Please wait…'; }
  else { btn.disabled = false; btn.textContent = originalText; }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || ('item-' + Date.now());
}

function linesJoin(arr) { return (arr || []).join('\n'); }
function parseLines(str) { return (str || '').split('\n').map(s => s.trim()).filter(Boolean); }

// ── Form helpers ───────────────────────────────────────────────

function applyAroundSelection(input, before, after = before, placeholder = 'text') {
  const start = input.selectionStart ?? input.value.length;
  const end   = input.selectionEnd ?? input.value.length;
  const selected = input.value.slice(start, end) || placeholder;
  const next = input.value.slice(0, start) + before + selected + after + input.value.slice(end);
  input.value = next;
  input.focus();
  input.selectionStart = start + before.length;
  input.selectionEnd   = start + before.length + selected.length;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function toggleLinePrefix(input, prefix) {
  const start = input.selectionStart ?? 0;
  const end   = input.selectionEnd ?? 0;
  const text  = input.value;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd   = text.indexOf('\n', end);
  const safeEnd   = lineEnd === -1 ? text.length : lineEnd;
  const block     = text.slice(lineStart, safeEnd);
  const lines     = block.split('\n');
  const allHavePrefix = lines.every(line => line.trim() === '' || line.startsWith(prefix));
  const nextLines = lines.map(line => {
    if (line.trim() === '') return line;
    return allHavePrefix ? line.replace(prefix, '') : `${prefix}${line}`;
  });
  const nextBlock = nextLines.join('\n');
  input.value = text.slice(0, lineStart) + nextBlock + text.slice(safeEnd);
  input.focus();
  input.selectionStart = lineStart;
  input.selectionEnd   = lineStart + nextBlock.length;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildRichTextToolbar(textarea) {
  const toolBtn = (label, title, onClick) => {
    const b = el('button', { class: 'admin-btn admin-btn-xs', type: 'button', title }, label);
    b.addEventListener('click', () => onClick(textarea));
    return b;
  };
  return el('div', { class: 'rich-toolbar' },
    toolBtn('B', 'Bold',   (t) => applyAroundSelection(t, '**')),
    toolBtn('I', 'Italic', (t) => applyAroundSelection(t, '*')),
    toolBtn('•', 'Bullet list', (t) => toggleLinePrefix(t, '- ')),
    toolBtn('1.', 'Numbered list', (t) => toggleLinePrefix(t, '1. ')),
    toolBtn('🔗', 'Link', (t) => applyAroundSelection(t, '[', '](https://example.com)', 'label'))
  );
}

function fld(label, input, spanFull) {
  const children = [el('label', {}, label)];
  if (input && input.tagName === 'TEXTAREA') {
    children.push(buildRichTextToolbar(input));
    children.push(el('div', { class: 'admin-muted rich-toolbar-hint' }, 'Formatting supported: **bold**, *italic*, lists, and links.'));
  }
  children.push(input);
  return el('div', { class: 'admin-field' + (spanFull ? ' g-span-full' : '') }, ...children);
}

function inp(type, value, placeholder) {
  const i = el('input', { class: 'admin-input', type: type || 'text', placeholder: placeholder || '' });
  if (value != null) i.value = String(value);
  return i;
}

function txta(value, rows, placeholder) {
  const t = el('textarea', { class: 'admin-input', rows: String(rows || 3), placeholder: placeholder || '' });
  if (value != null) t.value = Array.isArray(value) ? value.join('\n') : String(value);
  return t;
}

function sel(optArr, value) {
  const s = el('select', { class: 'admin-input' });
  optArr.forEach(([v, l]) => {
    const o = el('option', { value: v }, l);
    if (v === value) o.selected = true;
    s.appendChild(o);
  });
  return s;
}

// ── Validation ─────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_DOC_TYPES   = ['application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOC_SIZE   = 20 * 1024 * 1024;

function validateFile(file, type) {
  const allowed = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
  if (!allowed.includes(file.type)) {
    return `Invalid type. Only ${type === 'image' ? 'PNG/JPEG/WEBP' : 'PDF'} allowed.`;
  }
  if (file.size > maxSize) return `File too large (max ${formatBytes(maxSize)}).`;
  return null;
}

// ── Supabase wrappers ──────────────────────────────────────────

async function uploadFile(storagePath, file, onProgress) {
  const client = window.supabaseClient;
  if (onProgress) onProgress(30);
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  if (onProgress) onProgress(100);
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function saveProfileRow(updates) {
  const { error } = await window.supabaseClient.from('profile')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 'main');
  if (error) throw new Error(error.message);
}

async function fetchProfile() {
  const { data, error } = await window.supabaseClient.from('profile')
    .select('*').eq('id', 'main').single();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchDocuments() {
  const { data, error } = await window.supabaseClient.from('documents').select('*');
  if (error) throw new Error(error.message);
  return data || [];
}

async function saveDocumentRow(id, updates) {
  const { error } = await window.supabaseClient.from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function fetchSiteContent(key) {
  const { data, error } = await window.supabaseClient.from('site_content')
    .select('data').eq('section_key', key).single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data?.data || null;
}

async function saveSiteContent(key, jsonData) {
  const { error } = await window.supabaseClient.from('site_content')
    .upsert({ section_key: key, data: jsonData, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function fetchTable(table, orderCol) {
  let q = window.supabaseClient.from(table).select('*');
  if (orderCol) q = q.order(orderCol, { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function upsertRow(table, data) {
  const { error } = await window.supabaseClient.from(table)
    .upsert({ ...data, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function insertRow(table, data) {
  const { data: returned, error } = await window.supabaseClient.from(table)
    .insert({ ...data, updated_at: new Date().toISOString() }).select().single();
  if (error) throw new Error(error.message);
  return returned;
}

async function updateRow(table, id, data) {
  const { error } = await window.supabaseClient.from(table)
    .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function deleteRow(table, id) {
  const { error } = await window.supabaseClient.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Generic CRUD panel ─────────────────────────────────────────

function buildCrudPanel({ items, renderSummary, buildItemForm, onDelete }) {
  const wrap    = el('div', { class: 'crud-section' });
  const addSlot = el('div', {});
  const listEl  = el('div', { class: 'crud-list' });

  function makeRow(item) {
    const row        = el('div', { class: 'crud-row' });
    const expandSlot = el('div', { class: 'crud-expand-slot' });
    let open = false;

    const summaryEl = el('span', { class: 'crud-summary' });
    summaryEl.textContent = renderSummary(item);

    const editBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, '✏️ Edit');
    const delBtn  = el('button', { class: 'admin-btn danger admin-btn-xs', type: 'button' }, '🗑️');

    editBtn.addEventListener('click', () => {
      if (open) { open = false; expandSlot.innerHTML = ''; return; }
      open = true;
      expandSlot.innerHTML = '';
      expandSlot.appendChild(buildItemForm(item,
        (updated) => {
          Object.assign(item, updated);
          summaryEl.textContent = renderSummary(item);
          open = false; expandSlot.innerHTML = '';
        },
        () => { open = false; expandSlot.innerHTML = ''; }
      ));
    });

    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this item? This cannot be undone.')) return;
      delBtn.disabled = true;
      try { await onDelete(item); row.remove(); }
      catch (e) { alert('Delete failed: ' + e.message); delBtn.disabled = false; }
    });

    row.appendChild(el('div', { class: 'crud-row-top' },
      summaryEl,
      el('div', { class: 'crud-row-actions' }, editBtn, delBtn)
    ));
    row.appendChild(expandSlot);
    return row;
  }

  const addBtn = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '+ Add New');
  addBtn.addEventListener('click', () => {
    if (addSlot.children.length > 0) { addSlot.innerHTML = ''; return; }
    addSlot.appendChild(buildItemForm(null,
      (newItem) => {
        addSlot.innerHTML = '';
        items.unshift(newItem);
        listEl.insertBefore(makeRow(newItem), listEl.firstChild);
      },
      () => { addSlot.innerHTML = ''; }
    ));
  });

  wrap.appendChild(el('div', { class: 'crud-topbar' }, addBtn));
  wrap.appendChild(addSlot);
  items.forEach(item => listEl.appendChild(makeRow(item)));
  wrap.appendChild(listEl);
  return wrap;
}

// ── Upload section ─────────────────────────────────────────────

function buildUploadSection({ title, desc, storagePath, fileType, currentUrl, onSaved }) {
  const isImage   = fileType === 'image';
  const acceptAttr = isImage ? 'image/png,image/jpeg,image/webp' : 'application/pdf';
  const hint      = isImage ? 'PNG, JPEG or WEBP · max 5 MB' : 'PDF only · max 20 MB';

  const alertEl      = el('div', { class: 'admin-alert' });
  const progressWrap = el('div', { class: 'upload-progress' });
  const progressBar  = el('div', { class: 'progress-bar' });
  const progressLbl  = el('div', { class: 'progress-label' }, 'Uploading…');
  progressWrap.append(progressLbl, el('div', { class: 'progress-bar-wrap' }, progressBar));

  // Current-file display (photo thumbnail for images, link for docs)
  let currentEl = null;
  if (currentUrl && isImage) {
    const imgEl = el('img', { class: 'current-photo-preview', alt: 'Current photo' });
    imgEl.setAttribute('src', currentUrl);
    currentEl = el('div', { class: 'current-photo-wrap' },
      imgEl, el('span', { class: 'current-photo-label' }, 'Currently uploaded'));
  } else if (currentUrl && !isImage) {
    const shortName = decodeURIComponent(currentUrl.split('/').pop());
    currentEl = el('div', { class: 'current-file' },
      el('span', {}, '✅ '),
      el('a', { href: currentUrl, target: '_blank', rel: 'noreferrer' }, shortName)
    );
  }

  const fileInput = el('input', { type: 'file', accept: acceptAttr });
  const previewEl = el('div', { class: 'upload-preview' });
  let _previewBlobUrl = null;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const err = validateFile(file, fileType);
    if (err) { showAlert(alertEl, err, 'error'); fileInput.value = ''; previewEl.className = 'upload-preview'; return; }
    hideAlert(alertEl);
    // Revoke previous blob URL to free memory
    if (_previewBlobUrl) { URL.revokeObjectURL(_previewBlobUrl); _previewBlobUrl = null; }
    previewEl.innerHTML = '';
    previewEl.className = 'upload-preview show';
    if (isImage) {
      const blobUrl = URL.createObjectURL(file);
      // createObjectURL always returns a blob: URL; validate before assigning to src
      if (typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
        _previewBlobUrl = blobUrl;
        const img = el('img', { class: 'preview-img', alt: 'Preview' });
        img.setAttribute('src', blobUrl);
        previewEl.appendChild(img);
      }
    } else {
      // file.name is safe to use as text content (createTextNode handles escaping)
      const nameText = document.createTextNode(`${file.name} — ${formatBytes(file.size)}`);
      const nameSpan = el('span', {});
      nameSpan.appendChild(nameText);
      previewEl.appendChild(el('div', { class: 'preview-file-info' },
        el('span', { class: 'preview-file-icon' }, '📄'),
        nameSpan
      ));
    }
  });

  const uploadArea = el('div', { class: 'upload-area-sm' },
    fileInput,
    el('div', { class: 'upload-icon' }, isImage ? '🖼️' : '📄'),
    el('div', { class: 'upload-label' }, 'Click or drag & drop'),
    el('div', { class: 'upload-hint' }, hint)
  );

  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault(); uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files; fileInput.dispatchEvent(new Event('change')); }
  });

  const uploadBtn = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '⬆️ Upload & Save');
  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) { showAlert(alertEl, 'Select a file first.', 'error'); return; }
    const ve = validateFile(file, fileType);
    if (ve) { showAlert(alertEl, ve, 'error'); return; }

    setButtonLoading(uploadBtn, true, '⬆️ Upload & Save');
    hideAlert(alertEl);
    progressWrap.className = 'upload-progress show';
    progressBar.style.width = '10%';

    try {
      const publicUrl = await uploadFile(storagePath, file, pct => { progressBar.style.width = `${pct}%`; });
      await onSaved(publicUrl);
      progressBar.style.width = '100%';
      showAlert(alertEl, '✅ Uploaded and saved!', 'success');

      // Refresh current-file display
      if (currentEl && isImage) {
        const imgTag = currentEl.querySelector('img');
        if (imgTag) imgTag.setAttribute('src', publicUrl);
      } else if (currentEl && !isImage) {
        const aTag = currentEl.querySelector('a');
        if (aTag) {
          const shortName = decodeURIComponent(publicUrl.split('/').pop());
          aTag.setAttribute('href', publicUrl);
          aTag.textContent = shortName;
        }
      }
      fileInput.value = '';
      previewEl.className = 'upload-preview';
    } catch (e) {
      showAlert(alertEl, `Upload failed: ${e.message}`, 'error');
      progressWrap.className = 'upload-progress';
    } finally {
      setButtonLoading(uploadBtn, false, '⬆️ Upload & Save');
    }
  });

  const children = [
    el('div', { class: 'upload-section-header' },
      el('h3', {}, title),
      el('p', { class: 'admin-muted' }, desc)
    )
  ];
  if (currentEl) children.push(currentEl);
  children.push(
    el('div', { class: 'upload-row' },
      uploadArea,
      el('div', { class: 'upload-row-right' }, previewEl, progressWrap, alertEl, uploadBtn)
    )
  );
  return el('div', { class: 'upload-block' }, ...children);
}

// ── Image manager (multi-image upload/remove) ──────────────────

function buildImageManager(storagePrefix, initialImages, onChange) {
  let images = Array.isArray(initialImages) ? [...initialImages] : [];

  const grid      = el('div', { class: 'image-manager-grid' });
  const statusEl  = el('span', { class: 'img-mgr-status admin-muted' });
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: 'display:none' });
  const addBtn    = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, '+ Add Image');

  function renderGrid() {
    grid.innerHTML = '';
    images.forEach((img, idx) => {
      const src = (typeof img === 'string' && (img.startsWith('http') || img.startsWith('blob:')))
        ? img : `assets/${img}`;
      const removeBtn = el('button', {
        class: 'admin-btn danger admin-btn-xs img-remove-btn',
        type: 'button',
        title: 'Remove image'
      }, '✕');
      removeBtn.addEventListener('click', () => {
        images.splice(idx, 1);
        onChange([...images]);
        renderGrid();
      });
      grid.appendChild(el('div', { class: 'image-manager-thumb' },
        el('img', { src, alt: `Image ${idx + 1}` }),
        removeBtn
      ));
    });
  }

  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const err = validateFile(file, 'image');
    if (err) { statusEl.textContent = err; return; }
    addBtn.disabled = true;
    statusEl.textContent = 'Uploading…';
    try {
      const mimeToExt = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
      const ext  = mimeToExt[file.type] || 'jpg';
      const path = `${storagePrefix}/${Date.now()}.${ext}`;
      const url  = await uploadFile(path, file);
      images.push(url);
      onChange([...images]);
      statusEl.textContent = '';
      fileInput.value = '';
      renderGrid();
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    } finally {
      addBtn.disabled = false;
    }
  });

  renderGrid();

  return el('div', { class: 'admin-field g-span-full' },
    el('label', {}, 'Images'),
    el('div', { class: 'image-manager' },
      grid,
      el('div', { class: 'image-manager-add' }, addBtn, fileInput, statusEl)
    )
  );
}

// ── Panel: Profile ─────────────────────────────────────────────

function buildProfilePanel(profile) {
  const al      = el('div', { class: 'admin-alert' });
  const nameIn  = inp('text', profile.name || '', 'Full name');
  const titleIn = inp('text', profile.title || '', 'Title / headline');
  const saveBtn = el('button', { class: 'admin-btn primary', type: 'button' }, '💾 Save');

  saveBtn.addEventListener('click', async () => {
    const name = nameIn.value.trim();
    if (!name) { showAlert(al, 'Name is required.', 'error'); return; }
    setButtonLoading(saveBtn, true, '💾 Save');
    hideAlert(al);
    try {
      await saveProfileRow({ name, title: titleIn.value.trim() });
      showAlert(al, '✅ Saved!', 'success');
    } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); }
    finally { setButtonLoading(saveBtn, false, '💾 Save'); }
  });

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '👤 Profile Info'),
      el('div', { class: 'admin-grid-2' }, fld('Full Name', nameIn), fld('Title / Headline', titleIn)),
      al, saveBtn
    ),
    el('div', { class: 'admin-section card' },
      buildUploadSection({
        title: 'Profile Photo',
        desc:  'PNG/JPEG/WEBP · max 5 MB. Replaces the photo on the home page immediately.',
        storagePath: 'profile/profile-photo',
        fileType:    'image',
        currentUrl:  profile.photo_url || null,
        onSaved:     async (url) => { await saveProfileRow({ photo_url: url }); }
      })
    )
  );
}

// ── Panel: Contact ─────────────────────────────────────────────

function buildContactPanel(contact) {
  const al         = el('div', { class: 'admin-alert' });
  const emailIn    = inp('email', contact.email    || '', 'email@example.com');
  const phoneIn    = inp('text',  contact.phone    || '', '(+92) 335-0000000');
  const linkedinIn = inp('url',   contact.linkedin || '', 'https://linkedin.com/in/…');
  const saveBtn    = el('button', { class: 'admin-btn primary', type: 'button' }, '💾 Save');

  saveBtn.addEventListener('click', async () => {
    const data = { email: emailIn.value.trim(), phone: phoneIn.value.trim(), linkedin: linkedinIn.value.trim() };
    if (!data.email) { showAlert(al, 'Email is required.', 'error'); return; }
    setButtonLoading(saveBtn, true, '💾 Save');
    hideAlert(al);
    try {
      await saveSiteContent('contact', data);
      showAlert(al, '✅ Saved!', 'success');
    } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); }
    finally { setButtonLoading(saveBtn, false, '💾 Save'); }
  });

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '📞 Contact Info'),
      el('p', { class: 'admin-muted' }, 'Displayed in the profile card on the home page.'),
      el('div', { class: 'admin-grid-2' },
        fld('Email', emailIn),
        fld('Phone', phoneIn),
        fld('LinkedIn URL', linkedinIn, true)
      ),
      al, saveBtn
    )
  );
}

// ── Panel: Home ────────────────────────────────────────────────

function buildHomePanel(welcome) {
  const al      = el('div', { class: 'admin-alert' });
  const textIn  = txta(welcome.text || '', 6, 'Welcome / intro text shown on the home page…');
  const saveBtn = el('button', { class: 'admin-btn primary', type: 'button' }, '💾 Save');

  saveBtn.addEventListener('click', async () => {
    const text = textIn.value.trim();
    if (!text) { showAlert(al, 'Text cannot be empty.', 'error'); return; }
    setButtonLoading(saveBtn, true, '💾 Save');
    hideAlert(al);
    try {
      await saveSiteContent('welcome', { text });
      showAlert(al, '✅ Saved!', 'success');
    } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); }
    finally { setButtonLoading(saveBtn, false, '💾 Save'); }
  });

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '🏠 Home Page'),
      el('p', { class: 'admin-muted' }, 'Welcome / intro text displayed below the profile card.'),
      fld('Welcome Text', textIn, true),
      al, saveBtn
    )
  );
}

// ── Panel: Education ───────────────────────────────────────────

function buildEducationPanel(edu) {
  const al         = el('div', { class: 'admin-alert' });
  const degreeIn   = inp('text', edu.degree      || '', 'Degree title');
  const instIn     = inp('text', edu.institution || '', 'University / Institution');
  const collegeIn  = inp('text', edu.college     || '', 'Faculty / College');
  const locationIn = inp('text', edu.location    || '', 'City, Country');
  const durationIn = inp('text', edu.duration    || '', 'e.g. Nov 2021 – May 2025');
  const thesisIn   = txta(edu.thesis || '', 3, 'Thesis title…');
  const areasIn    = txta(linesJoin(edu.keyAreas), 4, 'One key area per line');
  const saveBtn    = el('button', { class: 'admin-btn primary', type: 'button' }, '💾 Save');

  saveBtn.addEventListener('click', async () => {
    const degree = degreeIn.value.trim();
    if (!degree) { showAlert(al, 'Degree is required.', 'error'); return; }
    const data = {
      degree, institution: instIn.value.trim(), college: collegeIn.value.trim(),
      location: locationIn.value.trim(), duration: durationIn.value.trim(),
      thesis: thesisIn.value.trim(), keyAreas: parseLines(areasIn.value)
    };
    setButtonLoading(saveBtn, true, '💾 Save');
    hideAlert(al);
    try {
      await saveSiteContent('education', data);
      showAlert(al, '✅ Saved!', 'success');
    } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); }
    finally { setButtonLoading(saveBtn, false, '💾 Save'); }
  });

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '🎓 Education'),
      el('div', { class: 'admin-grid-2' },
        fld('Degree', degreeIn, true),
        fld('Institution', instIn),
        fld('College / Faculty', collegeIn),
        fld('Location', locationIn),
        fld('Duration', durationIn),
        fld('Thesis', thesisIn, true),
        fld('Key Areas (one per line)', areasIn, true)
      ),
      al, saveBtn
    )
  );
}

// ── Panel: Publications ────────────────────────────────────────

function buildPublicationsPanel(pubs) {
  function renderSummary(p) {
    return `[${p.status || '?'}] ${p.title || 'Untitled'}`;
  }

  function buildItemForm(pub, onSave, onCancel) {
    const al        = el('div', { class: 'admin-alert' });
    const titleIn   = inp('text', pub?.title   || '', 'Paper title');
    const authIn    = inp('text', pub?.authors || '', 'Authors (comma-separated)');
    const journalIn = inp('text', pub?.journal || '', 'Journal / conference');
    const yearIn    = inp('text', pub?.year    || '', 'e.g. 2025');
    const statusIn  = sel([
      ['published',      'Published'],
      ['under-review',   'Under Review'],
      ['in-preparation', 'In Preparation']
    ], pub?.status || 'in-preparation');
    const statusTextIn = inp('text', pub?.status_text || pub?.statusText || '', 'e.g. Under review at Composite Structures');
    const doiIn     = inp('text', pub?.doi  || '', 'DOI (e.g. 10.4028/p-xxxxx)');
    const linkIn    = inp('url',  pub?.link || '', 'Full URL to paper');
    const saveBtn   = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save');
    const cancelBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      const data = {
        title, authors: authIn.value.trim(), journal: journalIn.value.trim(),
        year: yearIn.value.trim(), status: statusIn.value,
        status_text: statusTextIn.value.trim(),
        doi: doiIn.value.trim(), link: linkIn.value.trim()
      };
      setButtonLoading(saveBtn, true, '💾 Save');
      hideAlert(al);
      try {
        let result;
        if (pub?.id) { await updateRow('publications', pub.id, data); result = { ...pub, ...data }; }
        else { result = await insertRow('publications', data); }
        onSave(result);
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); setButtonLoading(saveBtn, false, '💾 Save'); }
    });

    cancelBtn.addEventListener('click', onCancel);

    return el('div', { class: 'crud-item-form' },
      el('div', { class: 'admin-grid-2' },
        fld('Title', titleIn, true),
        fld('Authors', authIn, true),
        fld('Journal / Conference', journalIn),
        fld('Year', yearIn),
        fld('Status', statusIn),
        fld('Status Details', statusTextIn, true),
        fld('DOI', doiIn),
        fld('Paper URL', linkIn, true)
      ),
      al,
      el('div', { class: 'crud-form-actions' }, saveBtn, cancelBtn)
    );
  }

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '📄 Publications'),
      el('p', { class: 'admin-muted' }, 'Manage research papers and manuscripts.'),
      buildCrudPanel({
        items: pubs,
        renderSummary,
        buildItemForm,
        onDelete: async (p) => { await deleteRow('publications', p.id); }
      })
    )
  );
}

// ── Panel: Work Experience ─────────────────────────────────────

function buildExperiencePanel(experiences) {
  function renderSummary(e) {
    return `${e.title || '?'} @ ${e.company || '?'} (${e.duration || ''})`;
  }

  function buildItemForm(exp, onSave, onCancel) {
    const al       = el('div', { class: 'admin-alert' });
    const titleIn  = inp('text', exp?.title       || '', 'Job title');
    const compIn   = inp('text', exp?.company     || '', 'Company name');
    const locIn    = inp('text', exp?.location    || '', 'City, Country');
    const durIn    = inp('text', exp?.duration    || '', 'e.g. Aug 2023 – Present');
    const descIn   = txta(exp?.description || '', 3, 'Brief role description…');
    const respIn   = txta(linesJoin(exp?.responsibilities), 4, 'One responsibility per line');
    const skillsIn = txta(linesJoin(exp?.skills), 3, 'One skill per line');

    let imgList = [...(exp?.images || [])];
    const imgMgrEl = buildImageManager(
      `experience/${exp?.id || ('new-' + Date.now())}`,
      imgList,
      (updated) => { imgList = updated; }
    );

    const saveBtn   = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save');
    const cancelBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      const id   = exp?.id || slugify(title);
      const data = {
        id, title, company: compIn.value.trim(), location: locIn.value.trim(),
        duration: durIn.value.trim(), description: descIn.value.trim(),
        responsibilities: parseLines(respIn.value), skills: parseLines(skillsIn.value),
        images: imgList
      };
      setButtonLoading(saveBtn, true, '💾 Save');
      hideAlert(al);
      try {
        await upsertRow('work_experience', data);
        onSave(data);
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); setButtonLoading(saveBtn, false, '💾 Save'); }
    });

    cancelBtn.addEventListener('click', onCancel);

    return el('div', { class: 'crud-item-form' },
      el('div', { class: 'admin-grid-2' },
        fld('Job Title', titleIn, true),
        fld('Company', compIn),
        fld('Location', locIn),
        fld('Duration', durIn, true),
        fld('Description', descIn, true),
        fld('Responsibilities (one per line)', respIn, true),
        fld('Skills (one per line)', skillsIn, true),
        imgMgrEl
      ),
      al,
      el('div', { class: 'crud-form-actions' }, saveBtn, cancelBtn)
    );
  }

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '💼 Work Experience'),
      el('p', { class: 'admin-muted' }, 'Manage professional positions and roles.'),
      buildCrudPanel({
        items: experiences,
        renderSummary,
        buildItemForm,
        onDelete: async (e) => { await deleteRow('work_experience', e.id); }
      })
    )
  );
}

// ── Panel: Awards ──────────────────────────────────────────────

function buildAwardsPanel(awards) {
  function renderSummary(a) {
    return `[${a.category || '?'}] ${a.title || '?'} (${a.year || ''})`;
  }

  function buildItemForm(award, onSave, onCancel) {
    const al      = el('div', { class: 'admin-alert' });
    const titleIn = inp('text', award?.title || '', 'Award / honor title');
    const catIn   = sel([['honor', 'Honor'], ['award', 'Award']], award?.category || 'award');
    const orgIn   = inp('text', award?.organization || '', 'Awarding organization');
    const yearIn  = inp('text', award?.year || '', 'Year(s), e.g. 2023 & 2024');
    const descIn  = txta(award?.description || '', 3, 'Brief description…');

    let imgList = [...(award?.images || [])];
    const imgMgrEl = buildImageManager(
      `awards/${award?.id || ('new-' + Date.now())}`,
      imgList,
      (updated) => { imgList = updated; }
    );

    const saveBtn   = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save');
    const cancelBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      const id   = award?.id || slugify(title);
      const data = {
        id, title, category: catIn.value,
        organization: orgIn.value.trim(), year: yearIn.value.trim(),
        description: descIn.value.trim(),
        images: imgList
      };
      setButtonLoading(saveBtn, true, '💾 Save');
      hideAlert(al);
      try {
        await upsertRow('awards', data);
        onSave(data);
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); setButtonLoading(saveBtn, false, '💾 Save'); }
    });

    cancelBtn.addEventListener('click', onCancel);

    return el('div', { class: 'crud-item-form' },
      el('div', { class: 'admin-grid-2' },
        fld('Title', titleIn, true),
        fld('Category', catIn),
        fld('Year', yearIn),
        fld('Organization', orgIn, true),
        fld('Description', descIn, true),
        imgMgrEl
      ),
      al,
      el('div', { class: 'crud-form-actions' }, saveBtn, cancelBtn)
    );
  }

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '🏆 Awards & Honors'),
      el('p', { class: 'admin-muted' }, 'Manage awards and recognitions.'),
      buildCrudPanel({
        items: awards,
        renderSummary,
        buildItemForm,
        onDelete: async (a) => { await deleteRow('awards', a.id); }
      })
    )
  );
}

// ── Panel: Certifications ──────────────────────────────────────

function buildCertificationsPanel(certs) {
  function renderSummary(c) { return `${c.title || '?'} — ${c.issuer || ''}`; }

  function buildItemForm(cert, onSave, onCancel) {
    const al       = el('div', { class: 'admin-alert' });
    const titleIn  = inp('text', cert?.title  || '', 'Certificate title');
    const issuerIn = inp('text', cert?.issuer || '', 'Issuing organization');
    const areasIn  = txta(linesJoin(cert?.areas), 3, 'One topic area per line');
    const linkIn   = inp('url', cert?.credential_link || cert?.credentialLink || '', 'Credential verification URL');
    const saveBtn   = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save');
    const cancelBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      const id   = cert?.id || slugify(title);
      const data = {
        id, title, issuer: issuerIn.value.trim(),
        areas: parseLines(areasIn.value), credential_link: linkIn.value.trim()
      };
      setButtonLoading(saveBtn, true, '💾 Save');
      hideAlert(al);
      try {
        await upsertRow('certifications', data);
        onSave(data);
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); setButtonLoading(saveBtn, false, '💾 Save'); }
    });

    cancelBtn.addEventListener('click', onCancel);

    return el('div', { class: 'crud-item-form' },
      el('div', { class: 'admin-grid-2' },
        fld('Certificate Title', titleIn, true),
        fld('Issuer', issuerIn),
        fld('Topic Areas (one per line)', areasIn),
        fld('Credential URL', linkIn, true)
      ),
      al,
      el('div', { class: 'crud-form-actions' }, saveBtn, cancelBtn)
    );
  }

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '📜 Certifications'),
      el('p', { class: 'admin-muted' }, 'Manage professional certifications and courses.'),
      buildCrudPanel({
        items: certs,
        renderSummary,
        buildItemForm,
        onDelete: async (c) => { await deleteRow('certifications', c.id); }
      })
    )
  );
}

// ── Panel: Projects (design or research) ──────────────────────

function inferLegacyProjectSections(proj, category) {
  const legacy = [
    { title: 'Problem / Motivation', items: proj?.problem || [] },
    { title: 'My Role',              items: proj?.role || [] },
    { title: 'Methods',              items: proj?.methods || [] },
    { title: 'Results',              items: proj?.results || [] },
    { title: category === 'design' ? 'PhD Direction' : 'Future Research Directions', items: proj?.phdDirection || proj?.phd_direction || [] }
  ];
  return legacy.filter(s => Array.isArray(s.items) && s.items.length > 0);
}

function normalizeProjectSections(rawSections, proj, category) {
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return inferLegacyProjectSections(proj, category);
  }
  return rawSections
    .map((sec) => ({
      title: (sec?.title || '').trim(),
      items: Array.isArray(sec?.items) ? sec.items.map(x => String(x).trim()).filter(Boolean) : []
    }))
    .filter(sec => sec.title || sec.items.length > 0);
}

function buildProjectSectionsEditor(initialSections, onChange) {
  let sections = Array.isArray(initialSections) ? [...initialSections] : [];
  const wrap = el('div', { class: 'project-sections-editor' });
  const list = el('div', { class: 'project-sections-list' });

  const notify = () => onChange(sections.map(s => ({ title: s.title, items: [...s.items] })));

  function sectionRow(sec, idx) {
    const titleIn = inp('text', sec.title || '', 'Section title (e.g. Problem / Motivation)');
    const bodyIn  = txta(linesJoin(sec.items), 4, 'One bullet point per line');
    titleIn.addEventListener('input', () => { sections[idx].title = titleIn.value; notify(); });
    bodyIn.addEventListener('input', () => { sections[idx].items = parseLines(bodyIn.value); notify(); });

    const upBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, '↑');
    const downBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, '↓');
    const delBtn = el('button', { class: 'admin-btn danger admin-btn-xs', type: 'button' }, '🗑️');

    upBtn.disabled = idx === 0;
    downBtn.disabled = idx === sections.length - 1;

    upBtn.addEventListener('click', () => {
      if (idx === 0) return;
      const [current] = sections.splice(idx, 1);
      sections.splice(idx - 1, 0, current);
      render();
    });
    downBtn.addEventListener('click', () => {
      if (idx >= sections.length - 1) return;
      const [current] = sections.splice(idx, 1);
      sections.splice(idx + 1, 0, current);
      render();
    });
    delBtn.addEventListener('click', () => {
      sections.splice(idx, 1);
      render();
    });

    return el('div', { class: 'project-section-item card' },
      el('div', { class: 'crud-row-top' },
        el('strong', {}, `Section ${idx + 1}`),
        el('div', { class: 'crud-row-actions' }, upBtn, downBtn, delBtn)
      ),
      el('div', { class: 'admin-grid-2 project-section-grid' },
        fld('Section Title', titleIn, true),
        fld('Items (one per line)', bodyIn, true)
      )
    );
  }

  function render() {
    list.innerHTML = '';
    sections.forEach((sec, idx) => list.appendChild(sectionRow(sec, idx)));
    notify();
  }

  const addBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, '+ Add Section');
  addBtn.addEventListener('click', () => {
    sections.push({ title: '', items: [] });
    render();
  });

  wrap.append(
    el('div', { class: 'crud-topbar' }, addBtn),
    list
  );
  render();
  return wrap;
}

function buildProjectsPanel(projects, category) {
  const panelTitle = category === 'design' ? '⚙️ Design Projects' : '🔬 Research Projects';

  function renderSummary(p) {
    return `${p.title || '?'} (${p.org || p.period || ''})`;
  }

  function buildItemForm(proj, onSave, onCancel) {
    const al        = el('div', { class: 'admin-alert' });
    const titleIn   = inp('text', proj?.title   || '', 'Project title');
    const orgIn     = inp('text', proj?.org     || '', 'Organization / company');
    const periodIn  = inp('text', proj?.period  || '', 'e.g. 2023–2025');
    const statusIn  = inp('text', proj?.status  || '', 'Status (e.g. Completed)');
    const summaryIn = txta(proj?.summary || '', 4, 'Short project summary (1–3 sentences)');
    let projectSections = normalizeProjectSections(proj?.sections || proj?.project_sections, proj, category);
    const sectionsEditor = buildProjectSectionsEditor(projectSections, (nextSections) => { projectSections = nextSections; });
    const tagsIn    = inp('text', (proj?.tags || []).join(', '), 'Comma-separated tags');

    // Image manager
    let imgList = [...(proj?.images || [])];
    const imgMgrEl = buildImageManager(
      `projects/${proj?.id || ('new-' + Date.now())}`,
      imgList,
      (updated) => { imgList = updated; }
    );

    // Research-only fields
    const paperStatusIn = category === 'research'
      ? inp('text', proj?.paperStatus || proj?.paper_status || '', 'Paper status') : null;
    const paperLinkIn   = category === 'research'
      ? inp('url',  proj?.paperLink  || proj?.paper_link  || '', 'Paper URL') : null;

    const saveBtn   = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save');
    const cancelBtn = el('button', { class: 'admin-btn admin-btn-xs', type: 'button' }, 'Cancel');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      const id   = proj?.id || slugify(title);
      const data = {
        id, category, title,
        org: orgIn.value.trim(), period: periodIn.value.trim(), status: statusIn.value.trim(),
        summary: summaryIn.value.trim(),
        sections: projectSections
          .map(sec => ({ title: (sec.title || '').trim(), items: (sec.items || []).map(x => String(x).trim()).filter(Boolean) }))
          .filter(sec => sec.title || sec.items.length > 0),
        tags:   tagsIn.value.split(',').map(s => s.trim()).filter(Boolean),
        images: imgList
      };
      if (category === 'research') {
        data.paper_status = paperStatusIn.value.trim();
        data.paper_link   = paperLinkIn.value.trim();
      }
      setButtonLoading(saveBtn, true, '💾 Save');
      hideAlert(al);
      try {
        await upsertRow('projects', data);
        onSave(data);
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); setButtonLoading(saveBtn, false, '💾 Save'); }
    });

    cancelBtn.addEventListener('click', onCancel);

    const gridChildren = [
      fld('Title', titleIn, true),
      fld('Organization', orgIn),
      fld('Period', periodIn),
      fld('Status', statusIn),
      fld('Summary', summaryIn, true),
      el('div', { class: 'admin-field g-span-full' },
        el('label', {}, 'Project Sections (add / remove / reorder)'),
        sectionsEditor
      ),
      fld('Tags (comma-separated)', tagsIn, true),
      ...(category === 'research' ? [fld('Paper Status', paperStatusIn), fld('Paper URL', paperLinkIn, false)] : []),
      imgMgrEl
    ];

    return el('div', { class: 'crud-item-form' },
      el('div', { class: 'admin-grid-2' }, ...gridChildren),
      al,
      el('div', { class: 'crud-form-actions' }, saveBtn, cancelBtn)
    );
  }

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, panelTitle),
      el('p', { class: 'admin-muted' }, `Manage your ${category} projects. Changes appear on the public site immediately.`),
      buildCrudPanel({
        items: projects,
        renderSummary,
        buildItemForm,
        onDelete: async (p) => { await deleteRow('projects', p.id); }
      })
    )
  );
}

// ── Panel: Documents ───────────────────────────────────────────

function buildDocumentsPanel(cv, portfolio, research) {
  function docBlock(doc, storagePath, docLabel) {
    const al         = el('div', { class: 'admin-alert' });
    const titleIn    = inp('text', doc.title    || '', 'Document title');
    const subtitleIn = inp('text', doc.subtitle || '', 'Short description');
    const saveBtn    = el('button', { class: 'admin-btn primary admin-btn-xs', type: 'button' }, '💾 Save Labels');

    saveBtn.addEventListener('click', async () => {
      const title = titleIn.value.trim();
      if (!title) { showAlert(al, 'Title is required.', 'error'); return; }
      setButtonLoading(saveBtn, true, '💾 Save Labels');
      hideAlert(al);
      try {
        await saveDocumentRow(doc.id, { title, subtitle: subtitleIn.value.trim() });
        showAlert(al, '✅ Saved!', 'success');
      } catch (e) { showAlert(al, `Error: ${e.message}`, 'error'); }
      finally { setButtonLoading(saveBtn, false, '💾 Save Labels'); }
    });

    return el('div', { class: 'doc-block admin-section card' },
      el('h3', {}, docLabel),
      buildUploadSection({
        title: 'Replace PDF',
        desc:  'PDF only · max 20 MB. Old file is overwritten automatically.',
        storagePath, fileType: 'document',
        currentUrl: doc.file_url || null,
        onSaved: async (url) => { await saveDocumentRow(doc.id, { file_url: url }); }
      }),
      el('div', { class: 'doc-labels' },
        el('div', { class: 'admin-grid-2' },
          fld('Title', titleIn),
          fld('Subtitle', subtitleIn)
        ),
        al, saveBtn
      )
    );
  }

  return el('div', { class: 'section-panel' },
    docBlock(cv,        'documents/cv.pdf',        'Curriculum Vitae (CV)'),
    docBlock(portfolio, 'documents/portfolio.pdf', 'Design Projects Portfolio PDF'),
    docBlock(research,  'documents/research.pdf',  'Research & Publications PDF')
  );
}

// ── Login screen ───────────────────────────────────────────────

function renderLogin(root) {
  const al         = el('div', { class: 'admin-alert' });
  const emailIn    = el('input', { class: 'admin-input', type: 'email',    placeholder: 'admin@example.com', id: 'l-email' });
  const passwordIn = el('input', { class: 'admin-input', type: 'password', placeholder: 'Password',          id: 'l-pass' });
  const loginBtn   = el('button', { class: 'admin-btn primary admin-btn-full', type: 'button' }, 'Sign In');

  loginBtn.addEventListener('click', async () => {
    const email = emailIn.value.trim(), password = passwordIn.value;
    if (!email || !password) { showAlert(al, 'Enter email and password.', 'error'); return; }
    setButtonLoading(loginBtn, true, 'Sign In');
    hideAlert(al);
    try {
      const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      root.innerHTML = '';
      await renderDashboard(root);
      document.getElementById('logoutBtn').style.display = '';
    } catch (e) {
      showAlert(al, `Login failed: ${e.message}`, 'error');
      setButtonLoading(loginBtn, false, 'Sign In');
    }
  });

  passwordIn.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });

  root.appendChild(
    el('div', { class: 'admin-login-wrap' },
      el('div', { class: 'admin-login-card card' },
        el('div', { class: 'admin-section-icon' }, '🔐'),
        el('h1', {}, 'Admin Login'),
        el('p', { class: 'admin-subtitle' }, 'Sign in to manage your portfolio content.'),
        al,
        el('div', { class: 'admin-field' }, el('label', { for: 'l-email' }, 'Email'), emailIn),
        el('div', { class: 'admin-field' }, el('label', { for: 'l-pass'  }, 'Password'), passwordIn),
        loginBtn
      )
    )
  );
}

// ── Not-configured screen ──────────────────────────────────────

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
        '🚀 Create a free Supabase project'
      )
    )
  );
}

// ── Static JSON fallback ───────────────────────────────────────

async function loadStaticFallback() {
  try {
    const [projRes, dataRes] = await Promise.allSettled([
      fetch('content/projects.json').then(r => r.json()),
      fetch('content/data.json').then(r => r.json()),
    ]);
    const projects = projRes.status === 'fulfilled' ? (projRes.value.projects || []) : [];
    const data     = dataRes.status === 'fulfilled'  ? dataRes.value : {};
    return {
      projects,
      publications:    data.publications    || [],
      workExperience:  data.workExperience  || [],
      awards:          data.awards          || [],
      certifications:  data.certifications  || [],
    };
  } catch(e) {
    return { projects: [], publications: [], workExperience: [], awards: [], certifications: [] };
  }
}

// Seed all static JSON data into Supabase (one-time import)
async function seedAllToSupabase(staticData) {
  const errors = [];

  // Publications — BIGSERIAL id, so always insert (with sort_order for ordering)
  for (let i = 0; i < staticData.publications.length; i++) {
    const p = staticData.publications[i];
    try {
      await window.supabaseClient.from('publications')
        .insert({
          sort_order:  i,
          title:       p.title       || '',
          authors:     p.authors     || '',
          journal:     p.journal     || '',
          year:        p.year        || '',
          status:      p.status      || 'in-preparation',
          status_text: p.statusText  || p.status_text || '',
          doi:         p.doi         || '',
          link:        p.link        || '',
          updated_at:  new Date().toISOString(),
        });
    } catch(e) { errors.push('Publication: ' + (p.title || '') + ' — ' + e.message); }
  }

  // Work Experience — TEXT id, safe to upsert
  for (let i = 0; i < staticData.workExperience.length; i++) {
    const e = staticData.workExperience[i];
    try {
      await upsertRow('work_experience', { ...e, sort_order: i });
    } catch(err) { errors.push('Experience: ' + (e.id || '') + ' — ' + err.message); }
  }

  // Awards — TEXT id, safe to upsert
  for (let i = 0; i < staticData.awards.length; i++) {
    const a = staticData.awards[i];
    try {
      await upsertRow('awards', { ...a, sort_order: i });
    } catch(err) { errors.push('Award: ' + (a.id || '') + ' — ' + err.message); }
  }

  // Certifications — TEXT id, safe to upsert
  for (let i = 0; i < staticData.certifications.length; i++) {
    const c = staticData.certifications[i];
    try {
      await upsertRow('certifications', {
        ...c,
        sort_order:      i,
        credential_link: c.credentialLink || c.credential_link || '',
      });
    } catch(err) { errors.push('Cert: ' + (c.id || '') + ' — ' + err.message); }
  }

  // Projects — TEXT id, safe to upsert
  for (let i = 0; i < staticData.projects.length; i++) {
    const p = staticData.projects[i];
    try {
      await upsertRow('projects', {
        ...p,
        sort_order:    i,
        sections:      normalizeProjectSections(p.sections || p.project_sections, p, p.category || 'design'),
        phd_direction: p.phdDirection  || p.phd_direction  || [],
        paper_status:  p.paperStatus   || p.paper_status   || '',
        paper_link:    p.paperLink     || p.paper_link     || '',
      });
    } catch(err) { errors.push('Project: ' + (p.id || '') + ' — ' + err.message); }
  }

  return errors;
}

// ── Panel: Import / Seed ───────────────────────────────────────

function buildSeedPanel(staticData, onImported) {
  const al     = el('div', { class: 'admin-alert' });
  const counts = el('ul', { class: 'seed-counts' },
    el('li', {}, `📄 Publications: ${staticData.publications.length}`),
    el('li', {}, `💼 Work Experience: ${staticData.workExperience.length}`),
    el('li', {}, `🏆 Awards: ${staticData.awards.length}`),
    el('li', {}, `📜 Certifications: ${staticData.certifications.length}`),
    el('li', {}, `⚙️ / 🔬 Projects: ${staticData.projects.length}`)
  );
  const importBtn = el('button', { class: 'admin-btn primary', type: 'button' }, '📥 Import all JSON data to Supabase');

  importBtn.addEventListener('click', async () => {
    if (!confirm('This will import all items from the static JSON files into Supabase. Already-existing items (by id) will be updated. Publications will be inserted fresh. Continue?')) return;
    setButtonLoading(importBtn, true, '📥 Import all JSON data to Supabase');
    hideAlert(al);
    try {
      const errors = await seedAllToSupabase(staticData);
      if (errors.length === 0) {
        showAlert(al, '✅ All data imported successfully! Reload the page to see the items in their panels.', 'success');
        if (onImported) onImported();
      } else {
        showAlert(al, `⚠️ Imported with ${errors.length} error(s): ${errors.slice(0, 3).join('; ')}`, 'error');
      }
    } catch(e) {
      showAlert(al, `Error: ${e.message}`, 'error');
    } finally {
      setButtonLoading(importBtn, false, '📥 Import all JSON data to Supabase');
    }
  });

  return el('div', { class: 'section-panel' },
    el('div', { class: 'admin-section card' },
      el('h2', {}, '📥 Import / Seed Data'),
      el('p', { class: 'admin-muted' }, 'Your portfolio data is stored in static JSON files. Use this panel to import that data into Supabase so it can be edited from the admin dashboard.'),
      el('p', { class: 'admin-muted' }, 'This is safe to run more than once — projects, experience, awards and certifications are upserted by id. Publications are always inserted fresh (avoid double-clicking).'),
      counts,
      al,
      importBtn
    )
  );
}

// ── Dashboard ──────────────────────────────────────────────────

async function renderDashboard(root) {
  // Fetch all data concurrently, fail gracefully per section
  let profile   = { name: 'Syed Aliyar Shah', title: 'Mechanical Design & Simulation Engineer', photo_url: null };
  let documents = [];
  let contact   = {};
  let welcome   = {};
  let education = {};
  let pubs      = [];
  let expList   = [];
  let awardList = [];
  let certList  = [];
  let designProjects   = [];
  let researchProjects = [];

  const results = await Promise.allSettled([
    fetchProfile(),                            // 0
    fetchDocuments(),                          // 1
    fetchSiteContent('contact'),               // 2
    fetchSiteContent('welcome'),               // 3
    fetchSiteContent('education'),             // 4
    fetchTable('publications', 'sort_order'),  // 5
    fetchTable('work_experience', 'sort_order'), // 6
    fetchTable('awards', 'sort_order'),        // 7
    fetchTable('certifications', 'sort_order'), // 8
    fetchTable('projects', 'sort_order'),      // 9
  ]);

  if (results[0].status === 'fulfilled') profile   = results[0].value;
  if (results[1].status === 'fulfilled') documents = results[1].value;
  if (results[2].status === 'fulfilled' && results[2].value) contact   = results[2].value;
  if (results[3].status === 'fulfilled' && results[3].value) welcome   = results[3].value;
  if (results[4].status === 'fulfilled' && results[4].value) education = results[4].value;
  if (results[5].status === 'fulfilled') pubs      = results[5].value;
  if (results[6].status === 'fulfilled') expList   = results[6].value;
  if (results[7].status === 'fulfilled') awardList = results[7].value;
  if (results[8].status === 'fulfilled') certList  = results[8].value;
  if (results[9].status === 'fulfilled') {
    const all = results[9].value;
    designProjects   = all.filter(p => p.category === 'design');
    researchProjects = all.filter(p => p.category === 'research');
  }

  // ── Static JSON fallback ───────────────────────────────────
  // When Supabase tables are empty, load from static JSON so existing content
  // is visible and editable in the admin. Saving any item upserts it to Supabase.
  let staticData = null;
  const needsFallback = pubs.length === 0 || expList.length === 0 ||
    awardList.length === 0 || certList.length === 0 ||
    (designProjects.length === 0 && researchProjects.length === 0);

  if (needsFallback) {
    staticData = await loadStaticFallback();

    // Publications — clear numeric id so saves use insertRow (BIGSERIAL table)
    if (pubs.length === 0) {
      pubs = staticData.publications.map((p, i) => ({
        ...p,
        id:          null,
        sort_order:  i,
        status_text: p.statusText || p.status_text || '',
      }));
    }

    // Work Experience — keep text id; upsertRow is idempotent
    if (expList.length === 0) {
      expList = staticData.workExperience.map((e, i) => ({ ...e, sort_order: i }));
    }

    // Awards
    if (awardList.length === 0) {
      awardList = staticData.awards.map((a, i) => ({ ...a, sort_order: i }));
    }

    // Certifications — normalise credentialLink → credential_link
    if (certList.length === 0) {
      certList = staticData.certifications.map((c, i) => ({
        ...c,
        sort_order:      i,
        credential_link: c.credentialLink || c.credential_link || '',
      }));
    }

    // Projects — normalise camelCase fields
    if (designProjects.length === 0 && researchProjects.length === 0) {
      const allProjects = staticData.projects.map((p, i) => ({
        ...p,
        sort_order:    i,
        sections:      normalizeProjectSections(p.sections || p.project_sections, p, p.category || 'design'),
        phd_direction: p.phdDirection  || p.phd_direction  || [],
        paper_status:  p.paperStatus   || p.paper_status   || '',
        paper_link:    p.paperLink     || p.paper_link     || '',
      }));
      designProjects   = allProjects.filter(p => p.category === 'design');
      researchProjects = allProjects.filter(p => p.category === 'research');
    }
  }

  const docMap    = {};
  documents.forEach(d => { docMap[d.id] = d; });
  const cv        = docMap['cv']        || { id: 'cv',        title: 'Curriculum Vitae',          subtitle: '', file_url: null };
  const portfolio = docMap['portfolio'] || { id: 'portfolio', title: 'Design Projects Portfolio',  subtitle: '', file_url: null };
  const research  = docMap['research']  || { id: 'research',  title: 'Research & Publications',    subtitle: '', file_url: null };

  // Helper: info banner shown when a panel is loaded from static JSON fallback
  function jsonFallbackBanner(panelName) {
    return el('div', { class: 'admin-alert show info json-fallback-banner' },
      `ℹ️ ${panelName} loaded from static JSON (Supabase table is empty). ` +
      'Save any item to persist it to Supabase, or use the "📥 Import Data" panel to import everything at once.'
    );
  }

  function wrapWithBanner(panelEl, panelName) {
    if (!needsFallback) return panelEl;
    const wrap = el('div', {});
    wrap.appendChild(jsonFallbackBanner(panelName));
    wrap.appendChild(panelEl);
    return wrap;
  }

  // Build sidebar nav
  const navItems = [
    { id: 'profile',      icon: '👤', label: 'Profile',           panel: () => buildProfilePanel(profile) },
    { id: 'contact',      icon: '📞', label: 'Contact',           panel: () => buildContactPanel(contact) },
    { id: 'home',         icon: '🏠', label: 'Home Page',         panel: () => buildHomePanel(welcome) },
    { id: 'education',    icon: '🎓', label: 'Education',         panel: () => buildEducationPanel(education) },
    null, // divider
    { id: 'publications', icon: '📄', label: 'Publications',      panel: () => wrapWithBanner(buildPublicationsPanel(pubs), 'Publications') },
    { id: 'experience',   icon: '💼', label: 'Experience',        panel: () => wrapWithBanner(buildExperiencePanel(expList), 'Work Experience') },
    { id: 'awards',       icon: '🏆', label: 'Awards',            panel: () => wrapWithBanner(buildAwardsPanel(awardList), 'Awards') },
    { id: 'certs',        icon: '📜', label: 'Certifications',    panel: () => wrapWithBanner(buildCertificationsPanel(certList), 'Certifications') },
    null, // divider
    { id: 'design',       icon: '⚙️', label: 'Design Projects',  panel: () => wrapWithBanner(buildProjectsPanel(designProjects, 'design'), 'Design Projects') },
    { id: 'research',     icon: '🔬', label: 'Research Projects', panel: () => wrapWithBanner(buildProjectsPanel(researchProjects, 'research'), 'Research Projects') },
    null, // divider
    { id: 'documents',    icon: '📁', label: 'Documents / PDFs',  panel: () => buildDocumentsPanel(cv, portfolio, research) },
    ...(staticData ? [null, { id: 'seed', icon: '📥', label: 'Import Data', panel: () => buildSeedPanel(staticData, () => { root.innerHTML = ''; renderDashboard(root); }) }] : []),
  ];

  const sidebar = el('nav', { class: 'admin-sidebar' });
  const content = el('div', { class: 'admin-content' });
  const layout  = el('div', { class: 'admin-layout' }, sidebar, content);

  let activeId = null;

  function switchPanel(id) {
    if (activeId === id) return;
    activeId = id;
    sidebar.querySelectorAll('.sidebar-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.id === id)
    );
    content.innerHTML = '';
    const navItem = navItems.find(n => n && n.id === id);
    if (navItem) content.appendChild(navItem.panel());
  }

  navItems.forEach(n => {
    if (!n) { sidebar.appendChild(el('div', { class: 'sidebar-divider' })); return; }
    const btn = el('button', { class: 'sidebar-nav-item', type: 'button', 'data-id': n.id });
    btn.appendChild(el('span', { class: 'sidebar-icon' }, n.icon));
    btn.appendChild(document.createTextNode(' ' + n.label));
    btn.addEventListener('click', () => switchPanel(n.id));
    sidebar.appendChild(btn);
  });

  root.appendChild(
    el('div', { class: 'admin-header-bar' },
      el('h1', {}, '⚙️ Admin Dashboard'),
      el('p', { class: 'admin-muted' },
        staticData
          ? 'Some data is loaded from static JSON — click "📥 Import Data" in the sidebar to persist everything to Supabase.'
          : 'All changes go live on the public site immediately.'
      )
    )
  );
  root.appendChild(layout);

  // If data came from JSON fallback, open the Import panel first so the user sees the prompt
  switchPanel(staticData ? 'seed' : 'profile');
}

// ── Entry point ────────────────────────────────────────────────

(async function initAdmin() {
  const root      = document.getElementById('adminApp');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!window.supabaseClient) {
    renderNotConfigured(root);
    return;
  }

  logoutBtn.addEventListener('click', async () => {
    await window.supabaseClient.auth.signOut();
    logoutBtn.style.display = 'none';
    root.innerHTML = '';
    renderLogin(root);
  });

  const { data: { session } } = await window.supabaseClient.auth.getSession();

  if (session) {
    logoutBtn.style.display = '';
    await renderDashboard(root);
  } else {
    renderLogin(root);
  }
})();
