(function () {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyReveal() {
    const targets = document.querySelectorAll('.card, .showcase-card, .highlight-card, .document-card, .publication-card, .experience-card, .award-card, .certification-card');
    targets.forEach((el) => el.classList.add('reveal-on-scroll'));

    if (REDUCED || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    targets.forEach((el) => obs.observe(el));
  }

  function applyTilt() {
    if (REDUCED) return;
    document.querySelectorAll('.highlight-card, .showcase-card, .document-card').forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  function init() {
    applyReveal();
    applyTilt();
  }

  window.addEventListener('hashchange', () => setTimeout(init, 80));
  window.addEventListener('load', init);

  const app = document.getElementById('app') || document.getElementById('adminApp');
  if (app && 'MutationObserver' in window) {
    const mo = new MutationObserver(() => init());
    mo.observe(app, { childList: true, subtree: true });
  }
})();
