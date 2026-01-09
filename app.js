
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
      el('img',{src:`assets/${p.figures?.[0] || 'projects_p1.png'}`, alt:p.title})
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
  const title = category==='design' ? 'Design Projects Portfolio' : 'Research Projects Portfolio';
  const desc = category==='design'
    ? 'Industry, competition, and engineering design work (CAD/CAE, packaging, manufacturing-readiness).'
    : 'Research papers, simulations, and materials/mechanics investigations.';
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Portfolio'),
    el('h1',{}, title),
    el('p',{}, desc),
    el('div',{class:'cta-row'},
      el('a',{class:'btn',href:'#/cv'},'CV'),
      el('a',{class:'btn',href:'#/docs'},'Documents'),
      el('a',{class:'btn primary',href: category==='design'?'#/design':'#/research'}, category==='design'?'Design':'Research')
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
        el('img',{src:`assets/${p.figures?.[0] || 'projects_p1.png'}`, alt:p.title})
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
  
  root.appendChild(el('div',{class:'footer'}, 'Tip: click a project card to open its detailed page. Use Back to return.'));
}

function renderProject(root, id){
  const p = state.data.projects.find(x=>x.id===id);
  if(!p){
    root.appendChild(el('div',{class:'card pad'}, el('h1',{},'Not found'), el('a',{href:'#/'},'Go home')));
    return;
  }
  
  const aside = el('div',{class:'card pad'},
    el('div',{class:'kicker'}, p.category==='design'?'Design project':'Research project'),
    el('h2',{},'At a glance'),
    el('p',{class:'small'}, `${p.org || ''} • ${p.period || ''}`),
    el('div',{class:'tagrow'}, ...(p.tags||[]).map(t=>el('span',{class:'tag'},t))),
    el('hr',{class:'sep'}),
    el('h3',{},'Links'),
    ...(p.links && p.links.length ? p.links.map(l=>el('a',{class:'btn',href:l.url,target:'_blank',rel:'noreferrer'},l.label)) : [el('div',{class:'small'},'No public links.')]),
    el('hr',{class:'sep'}),
    el('div',{class:'small'},'Evidence & Verification'),
    el('div',{class:'evidence-box'}, p.evidenceNote || 'Validation artifacts would strengthen claims for PhD reviewers.')
  );

  const main = el('div',{class:'card pad'},
    el('a',{class:'pill',href: p.category==='design'?'#/design':'#/research'},'← Back'),
    el('h1',{}, p.title),
    el('p',{class:'summary-detail'}, p.summary || ''),
    ...(p.figures && p.figures.length ? [el('figure',{}, el('img',{src:`assets/${p.figures[0]}`, alt:p.title}))] : []),
    
    el('h3',{},'Problem / Motivation'),
    el('ul',{}, ...(p.problem||['No problem statement provided.']).map(x=>el('li',{},x))),
    
    el('h3',{},'My Role'),
    el('ul',{}, ...(p.role||['No role details provided.']).map(x=>el('li',{},x))),
    
    el('h3',{},'Methods'),
    el('ul',{}, ...(p.methods||['No methods documented.']).map(x=>el('li',{},x))),
    
    el('h3',{},'Results'),
    el('ul',{}, ...(p.results||['No results documented.']).map(x=>el('li',{},x))),
    
    el('h3',{},'What I\'d do next (PhD direction)'),
    el('ul',{}, ...(p.phdDirection||['No PhD research directions identified.']).map(x=>el('li',{},x))),
    
    el('hr',{class:'sep'}),
    el('div',{class:'cta-row'},
      el('a',{class:'btn',href:'assets/Aliyar_Project_Portfolio.pdf', target:'_blank', rel:'noreferrer'},'Design Portfolio (PDF)'),
      el('a',{class:'btn',href:'assets/Aliyar_Portfolio_Full.pdf', target:'_blank', rel:'noreferrer'},'Full Portfolio (PDF)')
    )
  );

  root.appendChild(el('div',{class:'proj-page'}, main, aside));
  root.appendChild(el('div',{class:'footer'}, 'For proprietary work: replace sensitive details with sanitized diagrams and high-level role descriptions.'));
}

function renderCV(root){
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Curriculum Vitae'),
    el('h1',{},'CV'),
    el('p',{},'Download or view inline below.'),
    el('div',{class:'cta-row'},
      el('a',{class:'btn primary',href:'assets/Aliyar_CV_Oct_25.pdf', target:'_blank', rel:'noreferrer'},'Open in New Tab'),
      el('a',{class:'btn',href:'assets/Aliyar_CV_Oct_25.pdf', download:'Aliyar_CV_Oct_25.pdf'},'Download'),
      el('a',{class:'btn',href:'#/design'},'Design Portfolio'),
      el('a',{class:'btn',href:'#/research'},'Research Portfolio')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:'assets/Aliyar_CV_Oct_25.pdf',
      style:'width:100%; height:78vh; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.2)'
    })
  ));
  root.appendChild(el('div',{class:'footer'},
    'Tip: Replace assets/Aliyar_CV_Oct_25.pdf with newer version (same filename) to update.'
  ));
}

function renderDocsHub(root){
  root.appendChild(el('div',{class:'card pad'},
    el('div',{class:'kicker'},'Portfolio Documents'),
    el('h1',{},'Documents & Downloads'),
    el('p',{},'View and download portfolio documents, CV, and research materials.')
  ));
  
  const docs = [
    {
      id: 'cv',
      title: 'Curriculum Vitae',
      desc: 'Professional CV with experience, education, publications, and skills.',
      file: 'Aliyar_CV_Oct_25.pdf',
      viewRoute: '#/cv',
      thumb: 'cv'
    },
    {
      id: 'portfolio',
      title: 'Design Projects Portfolio',
      desc: 'Detailed design project documentation with CAD, FEA, and engineering work samples.',
      file: 'Aliyar_Project_Portfolio.pdf',
      viewRoute: '#/docs/portfolio',
      thumb: 'portfolio'
    },
    {
      id: 'research',
      title: 'Research Document',
      desc: 'Research projects, publications, and academic investigations overview.',
      file: 'Aliyar_Research_Document.pdf',
      viewRoute: '#/docs/research',
      thumb: 'research'
    }
  ];
  
  root.appendChild(el('div',{class:'docs-grid'}, 
    ...docs.map(doc => 
      el('div',{class:'doc-card card'},
        el('div',{class:'doc-thumb'},
          el('div',{class:'doc-icon'},'📄')
        ),
        el('div',{class:'doc-content'},
          el('h2',{}, doc.title),
          el('p',{class:'small'}, doc.desc),
          el('div',{class:'doc-actions'},
            el('a',{class:'btn primary',href:doc.viewRoute},'View Document'),
            el('a',{class:'btn',href:`assets/${doc.file}`, download:doc.file},'Download PDF')
          )
        )
      )
    )
  ));
  
  root.appendChild(el('div',{class:'footer'},
    'All documents are stored in /assets. Update files there to refresh content.'
  ));
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
      el('a',{class:'btn',href:'#/docs'},'← Back to Documents'),
      el('a',{class:'btn',href:'#/cv'},'CV')
    ),
    el('hr',{class:'sep'}),
    el('iframe',{
      src:`assets/${doc.file}`,
      style:'width:100%; height:78vh; border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(0,0,0,.2)'
    })
  ));
  root.appendChild(el('div',{class:'footer'},
    'Documents are hosted in /assets. Update files there to refresh content.'
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
