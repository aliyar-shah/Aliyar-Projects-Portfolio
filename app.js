
const state = {
  data: null,
  portfolioData: null,
  // Supabase overrides — null means "use static fallback"
  profilePhotoUrl: null,
  profileName:     null,
  profileTitle:    null,
  profilePhone:    null,
  cvUrl:           null,
  portfolioUrl:    null,
  researchUrl:     null,
  welcomeText:     null,
};

async function loadData(){
  const res = await fetch('content/projects.json');
  state.data = await res.json();
  
  // Load additional data for new pages
  try {
    const res2 = await fetch('content/data.json');
    state.portfolioData = await res2.json();
  } catch(e) {
    console.warn('Could not load data.json, using minimal fallbacks');
    state.portfolioData = {education: {}, publications: [], workExperience: [], awards: [], certifications: []};
  }

  // Optionally pull live data from Supabase (overrides static JSON)
  await loadSupabaseOverrides();
}

async function loadSupabaseOverrides(){
  if (!window.supabaseClient) return;
  try {
    const results = await Promise.allSettled([
      window.supabaseClient.from('profile').select('*').eq('id', 'main').single(),
      window.supabaseClient.from('documents').select('*'),
      window.supabaseClient.from('site_content').select('section_key,data'),
      window.supabaseClient.from('publications').select('*').order('sort_order', {ascending:true}),
      window.supabaseClient.from('work_experience').select('*').order('sort_order', {ascending:true}),
      window.supabaseClient.from('awards').select('*').order('sort_order', {ascending:true}),
      window.supabaseClient.from('certifications').select('*').order('sort_order', {ascending:true}),
      window.supabaseClient.from('projects').select('*').order('sort_order', {ascending:true}),
    ]);

    // Profile
    const profileRes = results[0];
    if (profileRes.status === 'fulfilled' && !profileRes.value.error && profileRes.value.data) {
      const p = profileRes.value.data;
      if (p.photo_url) state.profilePhotoUrl = p.photo_url;
      if (p.name)      state.profileName     = p.name;
      if (p.title)     state.profileTitle    = p.title;
    }

    // Documents
    const docsRes = results[1];
    if (docsRes.status === 'fulfilled' && !docsRes.value.error && docsRes.value.data) {
      docsRes.value.data.forEach(d => {
        if (d.id === 'cv'        && d.file_url) state.cvUrl        = d.file_url;
        if (d.id === 'portfolio' && d.file_url) state.portfolioUrl = d.file_url;
        if (d.id === 'research'  && d.file_url) state.researchUrl  = d.file_url;
      });
    }

    // site_content sections
    const contentRes = results[2];
    if (contentRes.status === 'fulfilled' && !contentRes.value.error && contentRes.value.data) {
      contentRes.value.data.forEach(row => {
        if (!row.data) return;
        if (row.section_key === 'contact') {
          if (row.data.email    && state.data?.links) state.data.links.email    = row.data.email;
          if (row.data.linkedin && state.data?.links) state.data.links.linkedin = row.data.linkedin;
          if (row.data.phone)    state.profilePhone = row.data.phone;
        }
        if (row.section_key === 'welcome' && row.data.text) {
          state.welcomeText = row.data.text;
        }
        if (row.section_key === 'education') {
          state.portfolioData.education = row.data;
        }
      });
    }

    // Publications
    const pubsRes = results[3];
    if (pubsRes.status === 'fulfilled' && !pubsRes.value.error && pubsRes.value.data && pubsRes.value.data.length > 0) {
      state.portfolioData.publications = pubsRes.value.data;
    }

    // Work Experience
    const expRes = results[4];
    if (expRes.status === 'fulfilled' && !expRes.value.error && expRes.value.data && expRes.value.data.length > 0) {
      state.portfolioData.workExperience = expRes.value.data;
    }

    // Awards
    const awardsRes = results[5];
    if (awardsRes.status === 'fulfilled' && !awardsRes.value.error && awardsRes.value.data && awardsRes.value.data.length > 0) {
      state.portfolioData.awards = awardsRes.value.data;
    }

    // Certifications
    const certsRes = results[6];
    if (certsRes.status === 'fulfilled' && !certsRes.value.error && certsRes.value.data && certsRes.value.data.length > 0) {
      state.portfolioData.certifications = certsRes.value.data.map(c => ({
        ...c,
        credentialLink: c.credential_link || c.credentialLink || ''
      }));
    }

    // Projects (replace static JSON projects when Supabase has data)
    const projRes = results[7];
    if (projRes.status === 'fulfilled' && !projRes.value.error && projRes.value.data && projRes.value.data.length > 0) {
      state.data.projects = projRes.value.data.map(p => ({
        ...p,
        sections: p.sections || p.project_sections || [],
        phdDirection: p.phd_direction || p.phdDirection || [],
        paperStatus:  p.paper_status  || p.paperStatus  || '',
        paperLink:    p.paper_link    || p.paperLink    || '',
      }));
    }

  } catch(e) {
    console.warn('[Supabase] Failed to load overrides:', e.message);
  }
}

function el(tag, attrs={}, ...children){
  const node = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === 'class') node.className = v;
    else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for(const ch of children){
    if(ch == null) continue;
    node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function mdInline(text = '') {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return out;
}

function mdTextBlock(text = '', className = '') {
  const wrap = el('div', className ? { class: className } : {});
  const lines = String(text).split('\n');
  let i = 0;
  while (i < lines.length) {
    if (/^\s*-\s+/.test(lines[i])) {
      const ul = el('ul', {});
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const li = el('li', {});
        li.innerHTML = mdInline(lines[i].replace(/^\s*-\s+/, '').trim());
        ul.appendChild(li);
        i++;
      }
      wrap.appendChild(ul);
      continue;
    }
    const paraLines = [];
    while (i < lines.length && !/^\s*-\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.join('').trim()) {
      const p = el('p', {});
      p.innerHTML = paraLines.map(line => mdInline(line)).join('<br>');
      wrap.appendChild(p);
    }
  }
  return wrap;
}

function mdList(items = []) {
  return el('ul', {}, ...(items || []).map(x => {
    const li = el('li', {});
    li.innerHTML = mdInline(x);
    return li;
  }));
}

function inferLegacyProjectSections(project) {
  const isDesign = project.category === 'design';
  const legacy = [
    { title: 'Problem / Motivation', items: project.problem || [] },
    { title: 'My Role', items: project.role || [] },
    { title: 'Methods', items: project.methods || [] },
    { title: 'Results', items: project.results || [] },
    { title: isDesign ? 'PhD Direction' : 'Future Research Directions', items: project.phdDirection || project.phd_direction || [] }
  ];
  return legacy.filter(s => Array.isArray(s.items) && s.items.length > 0);
}

function getProjectSections(project) {
  const sections = project.sections || project.project_sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    return inferLegacyProjectSections(project);
  }
  return sections
    .map(sec => ({
      title: (sec?.title || '').trim(),
      items: Array.isArray(sec?.items) ? sec.items.filter(Boolean) : []
    }))
    .filter(sec => sec.title || sec.items.length > 0);
}

// Returns a valid image src — handles full Supabase URLs and local asset paths
function imgSrc(img) {
  if (!img) return 'assets/projects_p1.png';
  if (typeof img === 'string' && (img.startsWith('https://') || img.startsWith('/') || img.startsWith('blob:'))) return img;
  return `assets/${img}`;
}

function getRoute(){
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//,'').split('/').filter(Boolean);
  return parts; // [] => home, ["cv"], ["design"], ["research"], ["project", id]
}

function setActiveNav(){
  const route = getRoute();
  const page = route[0] || 'home';
  document.querySelectorAll('[data-nav]').forEach(a=>{
    a.style.borderColor = 'rgba(255,255,255,.08)';
    if(a.dataset.nav === page) a.style.borderColor = 'rgba(94,234,212,.55)';
  });
}

function projectCard(p){
  return el('a', {class:'card proj proj-dense', href:`#/project/${p.id}`},
    el('div',{class:'thumb'},
      el('img',{src:imgSrc(p.images?.[0]), alt:p.title})
    ),
    el('div',{class:'proj-body'},
      el('div',{class:'proj-header'},
        el('div',{class:'kicker'}, (p.category==='design'?'Design project':'Research project')),
        el('h2',{}, p.title),
        el('div',{class:'org-period'},
          el('span',{class:'org'}, p.org || ''),
          el('span',{class:'period'}, p.period || '')
        )
      ),
      el('p',{class:'summary'}, p.summary || ''),
      el('div',{class:'tagrow'}, ...(p.tags||[]).slice(0,6).map(t=>el('span',{class:'tag'},t)))
    )
  );
}

function renderHome(root){
  const {links} = state.data;

  // Profile Section
  const profileSection = el('div', {class: 'profile-section card pad'},
    el('div', {class: 'profile-content'},
      // Profile photo
      el('div', {class: 'profile-photo-wrapper'},
        el('img', {
          class: 'profile-photo',
          src: state.profilePhotoUrl || 'assets/profile/profile-photo.png',
          alt: state.profileName || 'Syed Aliyar Shah',
          onerror: function() {
            // Fallback to initials if image not found
            this.style.display = 'none';
            this.parentElement.classList.add('fallback');
            const initials = el('div', {class: 'profile-initials'}, 'SAS');
            this.parentElement.appendChild(initials);
          }
        })
      ),
      // Profile info
      el('div', {class: 'profile-info'},
        el('h1', {class: 'profile-name'}, state.profileName  || 'SYED ALIYAR SHAH'),
        el('div', {class: 'profile-title'}, state.profileTitle || 'Mechanical Design & Simulation Engineer'),
        el('div', {class: 'profile-contact'},
          el('div', {class: 'contact-item'},
            el('span', {class: 'contact-icon'}, '📧'),
            el('a', {href: `mailto:${links.email}`, class: 'contact-link'}, links.email)
          ),
          el('div', {class: 'contact-item'},
            el('span', {class: 'contact-icon'}, '📱'),
            el('span', {class: 'contact-text'}, state.profilePhone || '(+92) 335-9926750')
          ),
          el('div', {class: 'contact-item'},
            el('span', {class: 'contact-icon'}, '🔗'),
            el('a', {
              href: links.linkedin,
              target: '_blank',
              rel: 'noreferrer',
              class: 'contact-link'
            }, 'LinkedIn Profile')
          )
        )
      )
    )
  );

  // Welcome text
  const defaultWelcome = 'Welcome! I am a Mechanical Design and Simulation Engineer with expertise in EV battery systems, CAE (FEA/CFD), composite materials, and multi-physics modeling. Currently pursuing advanced research in structural mechanics, sustainable energy systems, and computational methods. I hold a Bachelor\'s in Mechanical Engineering from NUST and have industry experience with Ohmitron Inc. (USA) working on high-voltage EV systems and power electronics.';
  const welcomeSection = el('div', {class: 'welcome-section card pad'},
    mdTextBlock(state.welcomeText || defaultWelcome, 'welcome-text'),
    el('div', {class: 'scroll-button-wrapper'},
      el('button', {
        class: 'btn primary scroll-to-highlights',
        onclick: () => {
          document.querySelector('#highlights-section').scrollIntoView({
            behavior: 'smooth'
          });
        }
      }, '▼ Professional Highlights')
    )
  );

  root.appendChild(profileSection);
  root.appendChild(welcomeSection);

  // Professional Highlights Section
  const highlightsSection = el('div', {class: 'highlights-section', id: 'highlights-section'},
    el('div', {class: 'section-header'},
      el('h2', {}, 'PROFESSIONAL HIGHLIGHTS'),
      el('p', {class: 'section-subtitle'}, 'Explore my academic and professional journey')
    ),
    el('div', {class: 'highlights-grid'},
      // Education
      el('a', {class: 'highlight-card card', href: '#/education'},
        el('div', {class: 'highlight-icon'}, '🎓'),
        el('h3', {}, 'Education'),
        el('p', {class: 'highlight-detail'}, 'NUST ME'),
        el('p', {class: 'highlight-detail'}, '2021-2025')
      ),
      // Publications
      el('a', {class: 'highlight-card card', href: '#/publications'},
        el('div', {class: 'highlight-icon'}, '📄'),
        el('h3', {}, 'Publications'),
        el('p', {class: 'highlight-detail'}, '6 Papers')
      ),
      // Research Projects
      el('a', {class: 'highlight-card card', href: '#/research'},
        el('div', {class: 'highlight-icon'}, '🔬'),
        el('h3', {}, 'Research'),
        el('h3', {}, 'Projects'),
        el('p', {class: 'highlight-detail'}, 'Portfolio')
      ),
      // Design Projects
      el('a', {class: 'highlight-card card', href: '#/design'},
        el('div', {class: 'highlight-icon'}, '⚙️'),
        el('h3', {}, 'Design'),
        el('h3', {}, 'Projects'),
        el('p', {class: 'highlight-detail'}, 'Portfolio')
      ),
      // Work Experience
      el('a', {class: 'highlight-card card', href: '#/experience'},
        el('div', {class: 'highlight-icon'}, '💼'),
        el('h3', {}, 'Work'),
        el('h3', {}, 'Experience'),
        el('p', {class: 'highlight-detail'}, '5 Positions')
      ),
      // Awards & Honors
      el('a', {class: 'highlight-card card', href: '#/awards'},
        el('div', {class: 'highlight-icon'}, '🏆'),
        el('h3', {}, 'Awards &'),
        el('h3', {}, 'Honors'),
        el('p', {class: 'highlight-detail'}, 'Gold Medal')
      ),
      // Certifications
      el('a', {class: 'highlight-card card', href: '#/certifications'},
        el('div', {class: 'highlight-icon'}, '📜'),
        el('h3', {}, 'Certifi-'),
        el('h3', {}, 'cations'),
        el('p', {class: 'highlight-detail'}, '25+')
      )
    )
  );

  root.appendChild(highlightsSection);

  root.appendChild(el('div',{class:'footer'},
    '© Syed Aliyar Shah — static site for GitHub Pages. Update projects via content/projects.json and /assets.'
  ));
}

function renderList(root, category){
  const title = category==='design' ? 'Design Projects Portfolio' : 'Research Projects & Publications';
  const desc = category==='design'
    ? 'Industry, competition, and engineering design work (CAD/CAE, packaging, manufacturing-readiness).'
    : 'Research papers, simulations, and materials/mechanics investigations.';
  
  // PDF paths and routes based on category
  const pdfPath = category==='design'
    ? (state.portfolioUrl || 'assets/Aliyar_Project_Portfolio.pdf')
    : (state.researchUrl  || 'assets/Aliyar_Research_Document.pdf');
  const viewerRoute = category==='design' ? '#/docs/portfolio' : '#/docs/research';
  
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Portfolio'),
    el('h1',{}, title),
    el('p',{}, desc),
    el('div',{class:'cta-row'},
      el('a',{class:'btn primary',href:viewerRoute},'View Full PDF'),
      el('a',{class:'btn',href:pdfPath, target:'_blank', rel:'noreferrer', download:''},'Download PDF')
    )
  ));
  const items = state.data.projects.filter(p=>p.category===category);
  
  // Add showcase section
  root.appendChild(el('div',{class:'section-title'}, 
    el('h2',{}, category==='design' ? 'Project Showcase' : 'Research Showcase'), 
    el('span',{class:'small'},`${items.length} items`)
  ));
  
  root.appendChild(el('div',{class:'showcase-grid'}, ...items.map(p => {
    return el('div',{class:'showcase-card card'},
      el('div',{class:'showcase-thumb'},
        el('img',{src:imgSrc(p.images?.[0]), alt:p.title})
      ),
      el('div',{class:'showcase-content'},
        el('div',{class:'showcase-header'},
          el('span',{class:'showcase-label'}, category==='design'?'Design':'Research'),
          p.status ? el('span',{class:'showcase-status'}, p.status) : null
        ),
        el('h3',{}, p.title),
        el('div',{class:'showcase-meta'},
          el('span',{class:'org'}, p.org || ''),
          p.period ? el('span',{class:'period'}, p.period) : null
        ),
        el('p',{class:'showcase-summary'}, (p.summary || '').length > 120 ? (p.summary || '').substring(0, 120) + '...' : (p.summary || '')),
        el('div',{class:'tagrow'}, ...(p.tags||[]).slice(0,4).map(t=>el('span',{class:'tag'},t))),
        el('a',{class:'btn primary',href:`#/project/${p.id}`},'View Details →')
      )
    );
  })));
  
  root.appendChild(el('div',{class:'footer'}, '© Syed Aliyar Shah — Engineering Portfolio'));
}

// Gallery state management
const galleryState = {};

function createGallery(projectId, images) {
  if (!images || images.length === 0) {
    images = ['projects_p1.png'];
  }
  
  // Initialize gallery state for this project
  if (!galleryState[projectId]) {
    galleryState[projectId] = { currentIndex: 0 };
  }
  
  const state = galleryState[projectId];
  
  // Main image container
  const mainImage = el('img', {
    class: 'gallery-image',
    src: imgSrc(images[state.currentIndex]),
    alt: 'Project image'
  });
  
  // Navigation buttons
  const prevBtn = el('button', {
    class: 'gallery-nav gallery-prev',
    onclick: (e) => {
      e.preventDefault();
      state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
      updateGallery();
    }
  }, '◀');
  
  const nextBtn = el('button', {
    class: 'gallery-nav gallery-next',
    onclick: (e) => {
      e.preventDefault();
      state.currentIndex = (state.currentIndex + 1) % images.length;
      updateGallery();
    }
  }, '▶');
  
  const galleryMain = el('div', { class: 'gallery-main' }, prevBtn, mainImage, nextBtn);
  
  // Thumbnails
  const thumbnails = images.map((img, idx) => {
    return el('img', {
      class: idx === state.currentIndex ? 'thumb active' : 'thumb',
      src: imgSrc(img),
      alt: `Thumbnail ${idx + 1}`,
      'data-index': idx,
      onclick: (e) => {
        e.preventDefault();
        state.currentIndex = idx;
        updateGallery();
      }
    });
  });
  
  const thumbnailsContainer = el('div', { class: 'gallery-thumbnails' }, ...thumbnails);
  
  const gallery = el('div', { class: 'gallery' }, galleryMain, thumbnailsContainer);
  
  // Update function
  function updateGallery() {
    mainImage.src = imgSrc(images[state.currentIndex]);
    thumbnails.forEach((thumb, idx) => {
      thumb.className = idx === state.currentIndex ? 'thumb active' : 'thumb';
    });
  }
  
  // Keyboard navigation
  const keyHandler = (e) => {
    if (e.key === 'ArrowLeft') {
      state.currentIndex = (state.currentIndex - 1 + images.length) % images.length;
      updateGallery();
    } else if (e.key === 'ArrowRight') {
      state.currentIndex = (state.currentIndex + 1) % images.length;
      updateGallery();
    }
  };
  
  // Add keyboard listener when gallery is created
  document.addEventListener('keydown', keyHandler);
  
  // Store cleanup function
  gallery._cleanup = () => {
    document.removeEventListener('keydown', keyHandler);
  };
  
  return gallery;
}

function renderProject(root, id){
  const p = state.data.projects.find(x=>x.id===id);
  if(!p){
    root.appendChild(el('div',{class:'card pad'}, el('h1',{},'Not found'), el('a',{href:'#/'},'Go home')));
    return;
  }
  
  // Back button
  root.appendChild(el('div', {class: 'project-back'},
    el('a', {class: 'pill', href: p.category === 'design' ? '#/design' : '#/research'}, 
      '← Back to ' + (p.category === 'design' ? 'Design' : 'Research') + ' Portfolio')
  ));
  
  // Create side panel with quick info
  const sidePanelItems = [
    el('div', {class: 'kicker'}, p.category === 'design' ? 'DESIGN PROJECT' : 'RESEARCH PROJECT')
  ];
  
  if (p.org) {
    sidePanelItems.push(
      el('div', {class: 'side-panel-section'},
        el('div', {class: 'side-panel-label'}, 'Organization'),
        el('div', {class: 'side-panel-value'}, p.org)
      )
    );
  }
  
  if (p.period) {
    sidePanelItems.push(
      el('div', {class: 'side-panel-section'},
        el('div', {class: 'side-panel-label'}, 'Period'),
        el('div', {class: 'side-panel-value'}, p.period)
      )
    );
  }
  
  // Research-specific fields
  if (p.category === 'research' && p.paperStatus) {
    sidePanelItems.push(
      el('div', {class: 'side-panel-section'},
        el('div', {class: 'side-panel-label'}, 'Status'),
        el('div', {class: 'side-panel-value'}, p.paperStatus)
      )
    );
  }
  
  if (p.tags && p.tags.length > 0) {
    sidePanelItems.push(
      el('hr', {class: 'sep'}),
      el('div', {class: 'side-panel-label'}, 'Tags'),
      el('div', {class: 'tagrow'}, ...(p.tags || []).map(t => el('span', {class: 'tag'}, t)))
    );
  }
  
  sidePanelItems.push(el('hr', {class: 'sep'}));
  
  // Add appropriate buttons based on category
  if (p.category === 'research') {
    if (p.paperLink) {
      sidePanelItems.push(
        el('a', {
          class: 'btn primary',
          href: p.paperLink,
          target: '_blank',
          rel: 'noreferrer'
        }, '📄 Read Full Research Paper')
      );
    }
    sidePanelItems.push(
      el('a', {
        class: 'btn',
        href: '#/docs/research'
      }, 'View Research Documents')
    );
  } else {
    sidePanelItems.push(
      el('a', {
        class: 'btn primary',
        href: '#/docs/portfolio'
      }, 'View Full Portfolio PDF')
    );
  }
  
  const sidePanel = el('div', {class: 'project-side-panel card pad'}, ...sidePanelItems);
  
  // Main content with gallery and details
  const mainContentItems = [];
  
  // Gallery
  if (p.images && p.images.length > 0) {
    mainContentItems.push(createGallery(id, p.images));
  }
  
  // Project details
  mainContentItems.push(
    el('h1', {}, p.title),
    mdTextBlock(p.summary || '', 'summary-detail')
  );

  const dynamicSections = getProjectSections(p);
  dynamicSections.forEach((sec) => {
    if ((!sec.title || !sec.title.trim()) && (!sec.items || sec.items.length === 0)) return;
    if (sec.title && sec.title.trim()) {
      mainContentItems.push(el('h3', {}, sec.title));
    }
    if (sec.items && sec.items.length > 0) {
      mainContentItems.push(mdList(sec.items));
    }
  });
  
  const mainContent = el('div', {class: 'project-main-content card pad'}, ...mainContentItems);
  
  // Layout container
  root.appendChild(el('div', {class: 'project-detail-layout'}, mainContent, sidePanel));
}

function renderCV(root){
  const cvPath = state.cvUrl || 'assets/Aliyar_CV_Oct_25.pdf';
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Curriculum Vitae'),
    el('h1',{},'CV'),
    el('p',{},'Academic and professional background. Download or view inline below.'),
    el('div',{class:'cta-row'},
      el('a',{class:'btn',href:cvPath, download:'Aliyar_CV.pdf'},'Download CV PDF'),
      el('a',{class:'btn primary',href:cvPath, target:'_blank', rel:'noreferrer'},'Open in New Tab')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:cvPath,
      style:'width:100%; height:78vh; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.2)'
    })
  ));
}

function renderDocsHub(root){
  const documents = [
    {
      id: 'cv',
      title: 'Curriculum Vitae',
      subtitle: 'Complete academic and professional background',
      thumbnail: 'assets/thumbnails/cv-thumbnail.png',
      features: [
        'Education & Academic Qualifications',
        'Professional Work Experience',
        'Technical Skills & Competencies',
        'Publications & Research',
        'Awards & Achievements'
      ],
      viewLink: '#/cv',
      downloadPath: state.cvUrl || 'assets/Aliyar_CV_Oct_25.pdf'
    },
    {
      id: 'portfolio',
      title: 'Design Projects Portfolio',
      subtitle: 'Comprehensive collection of engineering design projects',
      thumbnail: 'assets/thumbnails/portfolio-thumbnail.png',
      features: [
        'EV Battery Systems & Power Electronics',
        'CAD/CAE Analysis (FEA, CFD)',
        'Competition Winning Designs',
        'Industry & Professional Projects',
        'Mechanical Design & Manufacturing'
      ],
      viewLink: '#/docs/portfolio',
      downloadPath: state.portfolioUrl || 'assets/Aliyar_Project_Portfolio.pdf'
    },
    {
      id: 'research',
      title: 'Research & Publications',
      subtitle: 'Academic research papers and technical reports',
      thumbnail: 'assets/thumbnails/research-thumbnail.png',
      features: [
        'Published Research Papers',
        'Composite Materials Research',
        'Technical Analysis Reports',
        'Experimental Studies',
        'Conference Submissions'
      ],
      viewLink: '#/docs/research',
      downloadPath: state.researchUrl || 'assets/Aliyar_Research_Document.pdf'
    }
  ];

  // Header
  root.appendChild(
    el('div', {class: 'download-centre-header'},
      el('h1', {}, 'Download Centre'),
      el('p', {}, 'Access and download all portfolio documents. Browse through my complete collection of portfolio documents, research papers, and CV.')
    )
  );

  // Document cards
  const cardsContainer = el('div', {class: 'document-cards'});
  
  documents.forEach(doc => {
    const card = el('div', {class: 'document-card'},
      // Thumbnail
      el('div', {class: 'thumbnail-wrapper'},
        el('img', {
          class: 'document-thumbnail',
          src: doc.thumbnail,
          alt: `PDF preview of ${doc.title}`
        })
      ),
      // Info
      el('div', {class: 'document-info'},
        el('h2', {}, doc.title),
        el('p', {class: 'subtitle'}, doc.subtitle),
        el('ul', {class: 'document-features'},
          ...doc.features.map(f => el('li', {}, f))
        ),
        el('div', {class: 'document-actions'},
          el('a', {class: 'btn primary', href: doc.viewLink}, 'View Document'),
          el('a', {
            class: 'btn',
            href: doc.downloadPath,
            download: doc.downloadPath.split('/').pop(),
            target: '_blank'
          }, 'Download PDF')
        )
      )
    );
    cardsContainer.appendChild(card);
  });

  root.appendChild(cardsContainer);
}

function renderDocViewer(root, docType){
  const staticNames = {
    portfolio: 'Aliyar_Project_Portfolio.pdf',
    research:  'Aliyar_Research_Document.pdf',
  };
  const docs = {
    portfolio: {
      title:    'Design Projects Portfolio',
      file:     state.portfolioUrl || 'assets/Aliyar_Project_Portfolio.pdf',
      fileName: staticNames.portfolio,
      desc:     'Detailed design project documentation and visuals.'
    },
    research: {
      title:    'Research Document',
      file:     state.researchUrl || 'assets/Aliyar_Research_Document.pdf',
      fileName: staticNames.research,
      desc:     'Research projects, publications, and academic work overview.'
    }
  };
  const doc = docs[docType];
  if(!doc){
    root.appendChild(el('div',{class:'card pad'}, el('h1',{},'Not found'), el('a',{href:'#/'},'Go home')));
    return;
  }
  
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Portfolio Documents'),
    el('h1',{}, doc.title),
    el('p',{}, doc.desc),
    el('div',{class:'cta-row'},
      el('a',{class:'btn primary',href:doc.file, target:'_blank', rel:'noreferrer'},'Open in New Tab'),
      el('a',{class:'btn',href:doc.file, download:doc.fileName},'Download PDF'),
      el('a',{class:'btn',href:'#/docs'},'← Back to Download Centre')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:doc.file,
      style:'width:100%; height:78vh; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.2)'
    })
  ));
}

// NEW PAGE RENDERERS

function renderEducation(root) {
  const edu = state.portfolioData?.education || {};
  
  root.appendChild(el('div', {class: 'page-back'},
    el('a', {class: 'pill', href: '#/'}, '← Back to Home')
  ));
  
  root.appendChild(el('div', {class: 'card pad'},
    el('h1', {}, 'EDUCATION'),
    el('div', {class: 'education-main'},
      el('div', {class: 'education-icon'}, '🎓'),
      el('h2', {}, edu.degree || 'Bachelor of Engineering in Mechanical Engineering'),
      el('p', {class: 'institution'}, edu.institution || 'National University of Sciences and Technology (NUST)'),
      el('p', {}, edu.college || 'College of Electrical & Mechanical Engineering (CEME)'),
      el('p', {}, edu.location || 'Islamabad, Pakistan'),
      el('p', {class: 'duration'}, `Duration: ${edu.duration || 'November 2021 - May 2025'}`),
      el('h3', {}, 'Key Areas:'),
      mdList(edu.keyAreas || []),
      el('h3', {}, 'Thesis:'),
      mdTextBlock(edu.thesis || '', 'thesis')
    )
  ));
  
  if (edu.images && edu.images.length > 0) {
    root.appendChild(el('div', {class: 'education-images'},
      ...edu.images.map(img => 
        el('div', {class: 'education-image-wrapper'},
          el('img', {src: `assets/${img}`, alt: 'Campus photo', onerror: function() { this.parentElement.style.display = 'none'; }})
        )
      )
    ));
  }
}

function renderPublications(root) {
  const pubs = state.portfolioData?.publications || [];
  
  root.appendChild(el('div', {class: 'page-back'},
    el('a', {class: 'pill', href: '#/'}, '← Back to Home')
  ));
  
  root.appendChild(el('div', {class: 'card pad'},
    el('h1', {}, 'PUBLICATIONS'),
    el('p', {class: 'section-subtitle'}, 'Academic research papers and technical manuscripts')
  ));
  
  // Published
  const published = pubs.filter(p => p.status === 'published');
  if (published.length > 0) {
    root.appendChild(el('div', {class: 'pub-section-header'}, 'PUBLISHED'));
    published.forEach(pub => {
      root.appendChild(el('div', {class: 'publication-card card pad'},
        el('h3', {}, `[${pub.id}] ${pub.title}`),
        el('p', {class: 'pub-authors'}, pub.authors),
        el('p', {class: 'pub-journal'}, `${pub.journal}, ${pub.year}`),
        pub.link ? el('a', {class: 'btn primary', href: pub.link, target: '_blank', rel: 'noreferrer'}, `📄 View Paper - DOI: ${pub.doi}`) : null
      ));
    });
  }
  
  // Under Review
  const underReview = pubs.filter(p => p.status === 'under-review');
  if (underReview.length > 0) {
    root.appendChild(el('div', {class: 'pub-section-header'}, 'SUBMITTED (Under Review)'));
    underReview.forEach(pub => {
      root.appendChild(el('div', {class: 'publication-card card pad'},
        el('h3', {}, `[${pub.id}] ${pub.title}`),
        el('p', {class: 'pub-authors'}, pub.authors),
        el('p', {class: 'pub-journal'}, pub.journal),
        el('p', {class: 'pub-status'}, `Status: ${pub.status_text || pub.statusText || 'Manuscript Under Review'}`)
      ));
    });
  }
  
  // In Preparation
  const inPrep = pubs.filter(p => p.status === 'in-preparation');
  if (inPrep.length > 0) {
    root.appendChild(el('div', {class: 'pub-section-header'}, 'IN PREPARATION'));
    inPrep.forEach(pub => {
      root.appendChild(el('div', {class: 'publication-card card pad'},
        el('h3', {}, `[${pub.id}] ${pub.title}`),
        el('p', {class: 'pub-authors'}, pub.authors),
        el('p', {class: 'pub-journal'}, pub.journal)
      ));
    });
  }
}

function renderExperience(root) {
  const experiences = state.portfolioData?.workExperience || [];
  
  root.appendChild(el('div', {class: 'page-back'},
    el('a', {class: 'pill', href: '#/'}, '← Back to Home')
  ));
  
  root.appendChild(el('div', {class: 'card pad'},
    el('h1', {}, 'WORK EXPERIENCE'),
    el('p', {class: 'section-subtitle'}, 'Professional journey across industry and research')
  ));
  
  experiences.forEach(exp => {
    root.appendChild(el('div', {class: 'experience-card card pad'},
      el('div', {class: 'experience-layout'},
        // Image slideshow
        exp.images && exp.images.length > 0 ? createGallery(exp.id, exp.images) : null,
        // Details
        el('div', {class: 'experience-details'},
          el('h2', {}, exp.title),
          el('p', {class: 'exp-company'}, exp.company),
          el('p', {}, exp.location),
          el('p', {class: 'exp-duration'}, exp.duration),
          mdTextBlock(exp.description || ''),
          exp.responsibilities && exp.responsibilities.length > 0 ? mdList(exp.responsibilities) : null
        )
      )
    ));
  });
}

function renderAwards(root) {
  const awards = state.portfolioData?.awards || [];
  
  root.appendChild(el('div', {class: 'page-back'},
    el('a', {class: 'pill', href: '#/'}, '← Back to Home')
  ));
  
  root.appendChild(el('div', {class: 'card pad'},
    el('h1', {}, 'AWARDS & HONORS'),
    el('p', {class: 'section-subtitle'}, 'Recognition for academic and technical achievements')
  ));
  
  // Honors
  const honors = awards.filter(a => a.category === 'honor');
  if (honors.length > 0) {
    root.appendChild(el('div', {class: 'pub-section-header'}, 'HONORS'));
    honors.forEach(award => {
      root.appendChild(el('div', {class: 'award-card card pad'},
        el('div', {class: 'experience-layout'},
          award.images && award.images.length > 0 ? createGallery(award.id, award.images) : null,
          el('div', {class: 'award-details'},
            el('h2', {}, award.title),
            el('p', {class: 'award-org'}, award.organization),
            el('p', {class: 'award-year'}, award.year),
            mdTextBlock(award.description || '')
          )
        )
      ));
    });
  }
  
  // Awards
  const awardsOnly = awards.filter(a => a.category === 'award');
  if (awardsOnly.length > 0) {
    root.appendChild(el('div', {class: 'pub-section-header'}, 'AWARDS'));
    awardsOnly.forEach(award => {
      root.appendChild(el('div', {class: 'award-card card pad'},
        el('div', {class: 'experience-layout'},
          award.images && award.images.length > 0 ? createGallery(award.id, award.images) : null,
          el('div', {class: 'award-details'},
            el('h2', {}, award.title),
            el('p', {class: 'award-org'}, award.organization),
            el('p', {class: 'award-year'}, award.year),
            mdTextBlock(award.description || '')
          )
        )
      ));
    });
  }
}

function renderCertifications(root) {
  const certs = state.portfolioData?.certifications || [];
  const allCertsLink = state.portfolioData?.allCertificatesLink || '';
  
  root.appendChild(el('div', {class: 'page-back'},
    el('a', {class: 'pill', href: '#/'}, '← Back to Home')
  ));
  
  root.appendChild(el('div', {class: 'card pad'},
    el('h1', {}, 'CERTIFICATIONS'),
    el('p', {class: 'section-subtitle'}, 'Professional certifications and completed courses')
  ));
  
  certs.forEach(cert => {
    root.appendChild(el('div', {class: 'certification-card card pad'},
      el('div', {class: 'cert-icon'}, '📜'),
      el('h2', {}, cert.title),
      el('p', {class: 'cert-issuer'}, cert.issuer),
      cert.areas && cert.areas.length > 0 ? el('div', { class: 'cert-areas' }, mdList(cert.areas)) : null,
      cert.credentialLink ? el('a', {class: 'btn primary', href: cert.credentialLink, target: '_blank', rel: 'noreferrer'}, '🔗 View Credential') : null
    ));
  });
  
  if (allCertsLink) {
    root.appendChild(el('div', {class: 'card pad all-certs-card'},
      el('h2', {}, '📂 VIEW ALL 25+ CERTIFICATES'),
      el('p', {}, 'Complete collection of professional certifications'),
      el('a', {class: 'btn primary', href: allCertsLink, target: '_blank', rel: 'noreferrer'}, '🔗 View All Certificates')
    ));
  }
}

function render(){
  const root = document.getElementById('app');
  root.innerHTML = '';
  setActiveNav();
  const route = getRoute();

  if(route.length===0){
    renderHome(root);
    return;
  }
  if(route[0]==='cv'){ renderCV(root); return; }
  if(route[0]==='education'){ renderEducation(root); return; }
  if(route[0]==='publications'){ renderPublications(root); return; }
  if(route[0]==='experience'){ renderExperience(root); return; }
  if(route[0]==='awards'){ renderAwards(root); return; }
  if(route[0]==='certifications'){ renderCertifications(root); return; }
  if(route[0]==='design'){ renderList(root,'design'); return; }
  if(route[0]==='research'){ renderList(root,'research'); return; }
  if(route[0]==='project' && route[1]){ renderProject(root, route[1]); return; }
  if(route[0]==='docs'){
    if(!route[1]){ renderDocsHub(root); return; }
    if(route[1]){ renderDocViewer(root, route[1]); return; }
  }

  root.appendChild(el('div',{class:'card pad'}, el('h1',{},'Page not found'), el('a',{href:'#/'},'Go home')));
}

window.addEventListener('hashchange', render);

// ============================================
// MOBILE MENU FUNCTIONALITY
// ============================================

function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navlinks = document.querySelector('.navlinks');
  
  if (!hamburger || !navlinks) return;
  
  // Toggle menu on hamburger click
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    navlinks.classList.toggle('open');
    hamburger.classList.toggle('open');
  });
  
  // Close menu when a navigation link is clicked
  const navPills = document.querySelectorAll('.navlinks .pill');
  navPills.forEach(pill => {
    pill.addEventListener('click', () => {
      navlinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navlinks.contains(e.target)) {
      navlinks.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });
}

// ============================================
// TOUCH SWIPE SUPPORT FOR GALLERIES
// ============================================

let touchSwipeInitialized = false;

function initTouchSwipe() {
  let touchStartX = 0;
  let touchEndX = 0;
  
  function handleSwipe(galleryElement, projectId) {
    const diff = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      const state = galleryState[projectId];
      if (!state) return;
      
      const gallery = galleryElement.closest('.gallery');
      if (!gallery) return;
      
      const images = Array.from(gallery.querySelectorAll('.gallery-thumbnails .thumb'));
      const totalImages = images.length;
      
      if (diff > 0) {
        // Swipe left - next image
        state.currentIndex = (state.currentIndex + 1) % totalImages;
      } else {
        // Swipe right - previous image
        state.currentIndex = (state.currentIndex - 1 + totalImages) % totalImages;
      }
      
      // Update gallery
      const mainImage = gallery.querySelector('.gallery-image');
      const thumbs = gallery.querySelectorAll('.gallery-thumbnails .thumb');
      
      if (mainImage && thumbs.length > 0) {
        const imageSrc = thumbs[state.currentIndex].src;
        mainImage.src = imageSrc;
        
        thumbs.forEach((thumb, idx) => {
          thumb.className = idx === state.currentIndex ? 'thumb active' : 'thumb';
        });
      }
    }
  }
  
  // Add touch listeners to all galleries
  const galleries = document.querySelectorAll('.gallery-main');
  galleries.forEach((gallery) => {
    // Skip if already has listeners
    if (gallery.dataset.touchEnabled) return;
    
    // Try to find project ID from the gallery's context
    let projectId = null;
    const galleryContainer = gallery.closest('.gallery');
    
    // Find project ID from URL or context
    const route = getRoute();
    if (route[0] === 'project' && route[1]) {
      projectId = route[1];
    } else if (galleryContainer && galleryContainer.id) {
      projectId = galleryContainer.id;
    }
    
    if (projectId) {
      gallery.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      gallery.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe(gallery, projectId);
      }, { passive: true });
      
      // Mark as initialized
      gallery.dataset.touchEnabled = 'true';
    }
  });
}

// Re-initialize touch swipe on route change
window.addEventListener('hashchange', () => {
  setTimeout(initTouchSwipe, 100);
});

(async function init(){
  await loadData();
  render();
  initMobileMenu();
  initTouchSwipe();
})();
