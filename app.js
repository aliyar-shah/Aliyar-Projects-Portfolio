
const state = { data: null };

async function loadData(){
  const res = await fetch('content/projects.json');
  state.data = await res.json();
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
      el('img',{src:`assets/${p.images?.[0] || 'projects_p1.png'}`, alt:p.title})
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
  const {links, publications, projects} = state.data;
  const topDesign = projects.filter(p=>p.category==='design').slice(0,6);
  const topResearch = projects.filter(p=>p.category==='research').slice(0,6);

  root.appendChild(
    el('div',{class:'hero'},
      el('div',{class:'card pad'},
        el('div',{class:'kicker'},'PhD-focused engineering portfolio (US programs)'),
        el('h1',{},'Syed Aliyar Shah'),
        el('p',{},'Mechanical Engineer (NUST) with industry experience in EV battery systems, power electronics packaging, and CAE (FEA/CFD). Research interests: EV energy systems, mechanical design & analysis, composites, thermal and structural mechanics, and computational methods for multi-physics problems.'),
        el('div',{class:'cta-row'},
          el('a',{class:'btn primary',href:'#/cv'},'CV'),
          el('a',{class:'btn',href:'#/design'},'Design Portfolio'),
          el('a',{class:'btn',href:'#/research'},'Research Portfolio'),
          el('a',{class:'btn',href:'#/docs'},'All Documents')
        ),
        el('hr',{class:'sep'}),
        el('div',{class:'small'}, `Contact`),
        el('div',{class:'cta-row'},
          el('a',{class:'btn',href:`mailto:${links.email}`},links.email),
          el('a',{class:'btn',href:links.linkedin, target:'_blank', rel:'noreferrer'},'LinkedIn'),
          el('span',{class:'btn'}, links.phone)
        )
      ),
      el('div',{class:'card pad'},
        el('h2',{},'Publications'),
        el('div',{class:'small'},'Accurate listing from CV. Links to publicly accessible copies only.'),
        el('ul',{}, ...(publications||[]).map(pub=>{
          const li = el('li',{}, `${pub.title} — ${pub.status}`);
          if(pub.link){
            li.appendChild(el('span',{},' ('));
            li.appendChild(el('a',{href:pub.link,target:'_blank',rel:'noreferrer'},'link'));
            li.appendChild(el('span',{},')'));
          }
          return li;
        })),
        el('div',{class:'notice'},
          'Important: Some project results in the provided PDFs are written as claims (e.g., “20 min at 10C”, “-40°C operation”). For PhD reviewers, add evidence: test setup, assumptions, plots, standards, or public references.'
        )
      )
    )
  );

  root.appendChild(el('div',{class:'section-title'},
    el('h2',{},'Featured Design Projects'),
    el('a',{href:'#/design'},'View all →')
  ));
  root.appendChild(el('div',{class:'grid'}, ...topDesign.map(projectCard)));

  root.appendChild(el('div',{class:'section-title'},
    el('h2',{},'Featured Research Projects'),
    el('a',{href:'#/research'},'View all →')
  ));
  root.appendChild(el('div',{class:'grid'}, ...topResearch.map(projectCard)));

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
  const pdfPath = category==='design' ? 'assets/Aliyar_Project_Portfolio.pdf' : 'assets/Aliyar_Research_Document.pdf';
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
        el('img',{src:`assets/${p.images?.[0] || 'projects_p1.png'}`, alt:p.title})
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
    src: `assets/${images[state.currentIndex]}`,
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
      src: `assets/${img}`,
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
    mainImage.src = `assets/${images[state.currentIndex]}`;
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
    el('p', {class: 'summary-detail'}, p.summary || '')
  );
  
  if (p.problem && p.problem.length > 0) {
    mainContentItems.push(
      el('h3', {}, 'Problem / Motivation'),
      el('ul', {}, ...(p.problem || []).map(x => el('li', {}, x)))
    );
  }
  
  if (p.role && p.role.length > 0) {
    mainContentItems.push(
      el('h3', {}, 'My Role'),
      el('ul', {}, ...(p.role || []).map(x => el('li', {}, x)))
    );
  }
  
  if (p.methods && p.methods.length > 0) {
    mainContentItems.push(
      el('h3', {}, 'Methods'),
      el('ul', {}, ...(p.methods || []).map(x => el('li', {}, x)))
    );
  }
  
  if (p.results && p.results.length > 0) {
    mainContentItems.push(
      el('h3', {}, 'Results'),
      el('ul', {}, ...(p.results || []).map(x => el('li', {}, x)))
    );
  }
  
  if (p.phdDirection && p.phdDirection.length > 0) {
    mainContentItems.push(
      el('h3', {}, p.category === 'design' ? 'PhD Direction' : 'Future Research Directions'),
      el('ul', {}, ...(p.phdDirection || []).map(x => el('li', {}, x)))
    );
  }
  
  const mainContent = el('div', {class: 'project-main-content card pad'}, ...mainContentItems);
  
  // Layout container
  root.appendChild(el('div', {class: 'project-detail-layout'}, mainContent, sidePanel));
}

function renderCV(root){
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Curriculum Vitae'),
    el('h1',{},'CV'),
    el('p',{},'Academic and professional background. Download or view inline below.'),
    el('div',{class:'cta-row'},
      el('a',{class:'btn',href:'assets/Aliyar_CV_Oct_25.pdf', download:'Aliyar_CV_Oct_25.pdf'},'Download CV PDF'),
      el('a',{class:'btn primary',href:'assets/Aliyar_CV_Oct_25.pdf', target:'_blank', rel:'noreferrer'},'Open in New Tab')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:'assets/Aliyar_CV_Oct_25.pdf',
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
      downloadPath: 'assets/Aliyar_CV_Oct_25.pdf'
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
      downloadPath: 'assets/Aliyar_Project_Portfolio.pdf'
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
      downloadPath: 'assets/Aliyar_Research_Document.pdf'
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
          alt: doc.title
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
            download: '',
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
  const docs = {
    portfolio: {
      title: 'Design Projects Portfolio',
      file: 'Aliyar_Project_Portfolio.pdf',
      desc: 'Detailed design project documentation and visuals.'
    },
    research: {
      title: 'Research Document',
      file: 'Aliyar_Research_Document.pdf',
      desc: 'Research projects, publications, and academic work overview.'
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
      el('a',{class:'btn primary',href:`assets/${doc.file}`, target:'_blank', rel:'noreferrer'},'Open in New Tab'),
      el('a',{class:'btn',href:`assets/${doc.file}`, download:doc.file},'Download PDF'),
      el('a',{class:'btn',href:'#/docs'},'← Back to Download Centre')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:`assets/${doc.file}`,
      style:'width:100%; height:78vh; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.2)'
    })
  ));
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

(async function init(){
  await loadData();
  render();
})();
