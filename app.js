/**
 * CONSTANTS & DATA INITIALIZATION
 */
const KEY = 'ramPortfolioCMS_v3';
const clone = v => JSON.parse(JSON.stringify(v));
function cleanBase64Data(d){if(!d)return;if(d.projects){d.projects.forEach(p=>{if(p.id==='form-field'&&(!p.image||p.image.startsWith('data:'))){p.image='assets/editorial.jpg';p.images=['assets/editorial.jpg']}if(p.id==='nexa'&&(!p.image||p.image.startsWith('data:'))){p.image='assets/nexa.jpg';p.images=['assets/nexa.jpg']}if(p.image&&p.image.startsWith('data:'))p.image='assets/editorial.jpg';if(p.images)p.images=p.images.map(img=>(img&&img.startsWith('data:'))?'assets/editorial.jpg':img)})}if(d.reels){d.reels.forEach(r=>{if(r.poster&&r.poster.startsWith('data:'))r.poster='assets/kanso.jpg'})}}
let data = (() => {
  try {
    const localVal = JSON.parse(localStorage.getItem(KEY)) || clone(window.DEFAULT_PORTFOLIO);
    cleanBase64Data(localVal);
    return localVal;
  } catch {
    const def = clone(window.DEFAULT_PORTFOLIO);
    cleanBase64Data(def);
    return def;
  }
})();

/**
 * UTILITY FUNCTIONS
 */
const $ = s => document.querySelector(s);

function setText(s, v) {
  const el = $(s);
  if (el) el.textContent = v || '';
}

/**
 * THEME APPLICATION
 */
function applyTheme() {
  document.documentElement.style.setProperty('--accent', data.settings.accent);
  document.documentElement.style.setProperty('--paper', data.settings.background);
  document.title = data.settings.siteTitle;
}

/**
 * MAIN RENDER FUNCTION
 */
async function render() {
  applyTheme();
  
  const s = data.settings;
  const p = data.profile;
  
  const brandLogoItem = (data.logos || []).find(l => l.watermark && l.image);
  const brandLogo = brandLogoItem?.image || '';

  // --- Header & Text Setup ---
  setText('#workEyebrow', s.workEyebrow);
  setText('#workTitle', s.workTitle);
  setText('#mediaEyebrow', s.mediaEyebrow);
  setText('#mediaTitle', s.mediaTitle);
  setText('#logoEyebrow', s.logoEyebrow);
  setText('#logoTitle', s.logoTitle);
  setText('#servicesEyebrow', s.servicesEyebrow);
  setText('#servicesTitle', s.servicesTitle);
  setText('#contactEyebrow', s.contactEyebrow);
  setText('#contactTitle', s.contactTitle);
  setText('#contactSubtitle', s.contactSubtitle);
  setText('#footerText', s.footerText);
  
  setText('#heroEyebrow', p.eyebrow);
  setText('#heroTagline', p.tagline);
  setText('#heroName', p.name);
  setText('#heroRole', p.role);
  setText('#heroLocation', p.location);
  setText('#aboutName', p.name.split(' ')[0]);
  setText('#aboutBio', p.bio);
  
  const heroImage = $('#heroImage');
  if (heroImage) heroImage.src = p.image;
  
  const resumeLink = $('#resumeLink');
  if (resumeLink) resumeLink.href = p.resumeUrl || '#';

  // --- Stats ---
  const statsEl = $('#stats');
  if (statsEl) {
    statsEl.innerHTML = data.stats.map(stat => 
      `<div class="stat"><b>${stat.value}</b><span>${stat.label}</span></div>`
    ).join('');
  }

  // --- Projects ---
  const projectGrid = $('#projectGrid');
  if (projectGrid) {
    const projects = [...data.projects].sort((a, b) => a.order - b.order);
    projectGrid.innerHTML = projects.map(proj => {
      const imgs = getProjectImages(proj);
      return `
      <article class="project" data-id="${proj.id}">
        <div class="project-meta">
          <div>
            <p>${proj.category}</p>
            <h3>${proj.title}</h3>
          </div>
          <span>${proj.year}</span>
        </div>
        ${proj.description ? `<p class="project-desc">${proj.description}</p>` : ''}
        <div class="project-images-stack">
          ${imgs.map((src, i) => `
            <a href="${src}" target="_blank" rel="noopener" class="project-img-link" title="Click to open full size image in new tab ↗">
              <img src="${src}" alt="${proj.title} image ${i+1}" loading="lazy">
              <span class="img-open-badge">Open full image ↗</span>
            </a>
          `).join('')}
        </div>
      </article>
    `;
    }).join('');
  }

  // --- Reels / Media ---
  const reelGrid = $('#reelGrid');
  if (reelGrid) {
    const reels = [...(data.reels || [])]
      .filter(r => r.video && r.video.trim())
      .sort((a, b) => a.order - b.order);
      
    const reelViews = await Promise.all(reels.map(async r => ({
      ...r, 
      _video: await MediaDB.url(r.video)
    })));
    
    reelGrid.innerHTML = reelViews.map(r => `
      <article class="reel-card">
        <div class="video-shell">
          <video controls playsinline preload="none" poster="${r.poster || ''}" src="${r._video}" data-video-title="${r.title}">Your browser does not support video playback.</video>
          <span class="video-watermark">RAM PRAKASH ©</span>
          <button class="video-play" type="button"><b>▶</b><span>Play video</span></button>
        </div>
        <div class="video-error">This video format is not supported in your browser. Please try Chrome or contact me directly.</div>
        <div class="media-card-copy">
          <p>${r.category} · ${r.year}</p>
          <h4>${r.title}</h4>
          <p>${r.description || ''}</p>
          <div class="video-actions">
            <button class="open-video" data-url="video.html?src=${encodeURIComponent(r._video)}&title=${encodeURIComponent(r.title)}">Watch full video ↗</button>
          </div>
        </div>
      </article>
    `).join('');

    // Setup Video Events
    document.querySelectorAll('.reel-card').forEach(card => {
      const v = card.querySelector('video');
      const play = card.querySelector('.video-play');
      const error = card.querySelector('.video-error');
      const open = card.querySelector('.open-video');
      
      if (play && v && error) {
        play.onclick = async () => {
          play.classList.add('hide');
          try {
            await v.play();
          } catch {
            error.classList.add('show');
          }
        };
        v.addEventListener('play', () => play.classList.add('hide'));
        v.addEventListener('error', () => {
          play.classList.add('hide');
          error.classList.add('show');
        });
      }
      
      if (open) {
        open.onclick = () => {
          const url = open.dataset.url;
          const w = window.open(url, '_blank', 'noopener');
          if (!w) location.href = url;
        };
      }
    });
  }

  // --- Brochures ---
  const brochureGrid = $('#brochureGrid');
  if (brochureGrid) {
    const brochures = [...(data.brochures || [])].sort((a, b) => a.order - b.order);
    const brochureViews = await Promise.all(brochures.map(async b => ({
      ...b, 
      _pdf: await MediaDB.url(b.pdf)
    })));
    
    brochureGrid.innerHTML = brochureViews.map(b => `
      <article class="brochure-card" data-brochure="${b.id}">
        <div class="pdf-stage">
          <canvas id="canvas-${b.id}"></canvas>
          ${brandLogo ? `<img class="brochure-watermark" src="${brandLogo}" alt="">` : ''}
        </div>
        <div class="pdf-controls">
          <button data-prev="${b.id}">← Previous</button>
          <span id="page-${b.id}">Page 1 / …</span>
          <button data-next="${b.id}">Next →</button>
          <a href="${b._pdf}" target="_blank" rel="noopener">Full PDF ↗</a>
        </div>
        <div class="media-card-copy">
          <p>${b.category} · ${b.year}</p>
          <h4>${b.title}</h4>
          <p>${b.description || ''}</p>
        </div>
      </article>
    `).join('');
    
    setupBrochures(brochureViews.map(b => ({ ...b, pdf: b._pdf })));
  }

  // --- Logos ---
  const logoGrid = $('#logoGrid');
  if (logoGrid) {
    const logos = [...(data.logos || [])].sort((a, b) => a.order - b.order);
    logoGrid.innerHTML = logos.map((l, i) => `
      <article class="logo-tile">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="logo-mark mark-${l.mark || 'letter'} ${l.image ? 'has-image' : ''}" style="--logo-color:${l.color || '#151411'}">
          ${l.image ? `<a href="${l.image}" target="_blank" rel="noopener"><img src="${l.image}" alt="${l.name} logo"></a>` : ''}
        </div>
        <div class="logo-info">
          <b>${l.name}</b>
          <span>${l.subtitle}</span>
        </div>
      </article>
    `).join('');
    
    // Add Brand Watermark
    const oldWatermark = document.querySelector('.logos > .section-watermark');
    if (oldWatermark) oldWatermark.remove();
    
    if (brandLogo) {
      const wm = document.createElement('img');
      wm.className = 'section-watermark';
      wm.src = brandLogo;
      wm.alt = '';
      const logosSection = document.querySelector('.logos');
      if (logosSection) logosSection.appendChild(wm);
    }
  }

  // --- Services ---
  const serviceList = $('#serviceList');
  if (serviceList) {
    serviceList.innerHTML = data.services.map((s, i) => `
      <article class="service">
        <b>${String(i + 1).padStart(2, '0')}</b>
        <h3>${s.title}</h3>
        <p>${s.description}</p>
      </article>
    `).join('');
  }

  // --- Contact Links ---
  const contactLinks = $('#contactLinks');
  if (contactLinks) {
    const links = [];
    if (p.email) links.push(['Email', `mailto:${p.email}`, p.email]);
    if (p.phone) links.push(['Phone', `tel:${p.phone.replace(/\s/g, '')}`, p.phone]);
    if (p.linkedin && p.linkedin !== '#') links.push(['LinkedIn', p.linkedin, 'View Profile']);
    if (p.behance && p.behance !== '#') links.push(['Behance', p.behance, 'View Portfolio']);
    if (p.instagram && p.instagram !== '#') links.push(['Instagram', p.instagram, 'Follow']);
    
    contactLinks.innerHTML = links.map(([n, u, value]) => `
      <a href="${u}"><small>${n}</small><strong>${value}</strong></a>
    `).join('');
  }


}

/**
 * BROCHURES SETUP (Lazy loaded via IntersectionObserver for instant page load)
 */
async function setupBrochures(items) {
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => loadSingleBrochure(item));
    return;
  }
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        const itemId = card.dataset.brochure;
        const item = items.find(x => x.id === itemId);
        if (item) {
          obs.unobserve(card);
          loadSingleBrochure(item);
        }
      }
    });
  }, { rootMargin: '300px' });

  items.forEach(item => {
    const card = document.querySelector(`[data-brochure="${item.id}"]`);
    if (card) observer.observe(card);
  });
}

async function loadSingleBrochure(item) {
  try {
    const canvas = $(`#canvas-${item.id}`);
    const status = $(`#page-${item.id}`);
    if (!canvas || !status) return;

    status.textContent = 'Loading brochure…';
    const pdf = await pdfjsLib.getDocument(item.pdf).promise;
    const state = { pdf, page: 1, rendering: false };
    
    async function draw() {
      if (state.rendering) return;
      state.rendering = true;
      const page = await pdf.getPage(state.page);
      const viewport = page.getViewport({ scale: 1.15 });
      const ctx = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      status.textContent = `Page ${state.page} / ${pdf.numPages}`;
      state.rendering = false;
    }
    
    const prevBtn = document.querySelector(`[data-prev="${item.id}"]`);
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (state.page > 1) { state.page--; draw(); }
      };
    }
    
    const nextBtn = document.querySelector(`[data-next="${item.id}"]`);
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (state.page < pdf.numPages) { state.page++; draw(); }
      };
    }
    
    draw();
  } catch (err) {
    const status = $(`#page-${item.id}`);
  }
}

/**
 * MODAL HANDLING
 */
function getProjectImages(p) {
  if (!p) return [];
  if (Array.isArray(p.images) && p.images.length > 0) return p.images;
  if (p.image) return [p.image];
  return [];
}

function openProject(id) {
  const p = data.projects.find(x => x.id === id);
  if (!p) return;
  
  const modalGallery = $('#modalGallery');
  if (modalGallery) {
    const imgs = getProjectImages(p);
    modalGallery.innerHTML = imgs.map((src, i) => `
      <a href="${src}" target="_blank" rel="noopener" class="modal-img-link" title="Click to open full image in new tab ↗">
        <img src="${src}" alt="${p.title} image ${i+1}" loading="lazy">
        <span class="img-open-hint">Open full image in new tab ↗</span>
      </a>
    `).join('');
  }
  
  setText('#modalMeta', `${p.category} / ${p.year}`);
  setText('#modalTitle', p.title);
  setText('#modalDesc', p.description);
  setText('#modalApproach', p.approach);
  
  const modal = $('#projectModal');
  if (modal) modal.showModal();
}

const modalClose = $('.modal-close');
if (modalClose) {
  modalClose.addEventListener('click', () => {
    const modal = $('#projectModal');
    if (modal) modal.close();
  });
}

const projectModal = $('#projectModal');
if (projectModal) {
  projectModal.addEventListener('click', e => {
    if (e.target === projectModal) projectModal.close();
  });
}

/**
 * UI EVENTS & INIT
 */

// Hamburger Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav nav');
if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('open');
  });
  
  // Close menu when clicking a nav link
  navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('open');
  }));
}

// Scroll Events (Progress Bar & Active Nav Highlight)
window.addEventListener('scroll', () => {
  // Progress Bar
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = scrollHeight > 0 ? (scrollTop / scrollHeight * 100) + '%' : '0%';
  }
  
  // Active Nav Highlighting
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav nav a');
  
  let currentSection = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    // Adjust logic to detect current section on scroll
    if (scrollY >= (sectionTop - sectionHeight / 3)) {
      currentSection = section.getAttribute('id');
    }
  });
  
  if (currentSection) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  }
});

// Dynamic Footer Year
const yearEl = document.getElementById('footerYear');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Storage / Broadcast Sync
window.addEventListener('storage', e => {
  if (e.key === KEY) location.reload();
});

try {
  const updates = new BroadcastChannel('ram-portfolio-updates');
  updates.onmessage = () => location.reload();
} catch (e) {
  // BroadcastChannel not supported or error
}

/**
 * BOOTSTRAP
 */
async function boot() {
  try {
    const r = await fetch('/api/data', { cache: 'no-store' });
    if (r.ok) {
      const saved = await r.json();
      data = {
        ...DEFAULT_PORTFOLIO,
        ...saved,
        settings: { ...DEFAULT_PORTFOLIO.settings, ...(saved.settings || {}) },
        profile: { ...DEFAULT_PORTFOLIO.profile, ...(saved.profile || {}) },
        stats: saved.stats || DEFAULT_PORTFOLIO.stats
      };
      cleanBase64Data(data);
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    }
  } catch (e) {
    // Fallback to local storage data
  }
  await render();
}

boot();