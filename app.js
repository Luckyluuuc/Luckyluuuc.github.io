(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional preference */ } };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lang = read('luc-language') === 'fr' ? 'fr' : 'en';
  let paused = reduced.matches || read('luc-motion') === 'paused';
  let drawOnce = () => {};
  let resumeNetwork = () => {};
  let visibleCount = 4;
  function updateCount() {
    $('.work-count').textContent = String(visibleCount).padStart(2, '0') + ' ' + (lang === 'fr' ? 'TRAVAUX CHOISIS' : 'SELECTED WORKS');
  }
  function updateMotion() {
    document.body.classList.toggle('motion-paused', paused);
    $('#motion').textContent = paused ? '▷' : 'Ⅱ';
    $('#motion').setAttribute('aria-pressed', String(paused));
    const label = lang === 'fr' ? (paused ? 'Reprendre les animations' : 'Mettre les animations en pause') : (paused ? 'Resume animations' : 'Pause animations');
    $('#motion').setAttribute('aria-label', label);
    $('#map-motion').textContent = paused ? '▷' : 'Ⅱ';
    $('#map-motion').setAttribute('aria-pressed', String(paused));
    $('#map-motion').setAttribute('aria-label', label);
    $('#footer-motion').textContent = label;
  }
  function setLanguage(value) {
    lang = value;
    document.documentElement.lang = lang;
    $$('[data-en][data-fr]').forEach(el => { el.textContent = el.dataset[lang]; });
    $('#language').innerHTML = lang === 'en' ? 'EN <span>/ FR</span>' : 'FR <span>/ EN</span>';
    $('#language').setAttribute('aria-label', lang === 'en' ? 'Passer en français' : 'Switch to English');
    $('nav').setAttribute('aria-label', lang === 'fr' ? 'Navigation principale' : 'Main navigation');
    document.title = lang === 'fr' ? 'Luc Brun — Recherche & sécurité des agents IA' : 'Luc Brun — AI Safety & Agent Research';
    $('meta[name="description"]').content = lang === 'fr' ? 'Luc Brun, doctorant en sécurisation et alignement des agents IA en environnement logiciel. Recherche, publication, projets et parcours.' : 'Luc Brun, PhD candidate working on the safety and alignment of AI agents in software environments. Research, publications, projects and experience.';
    $$('a[href*="Luc-Brun-CV"]').forEach(a => { a.href = lang === 'fr' ? './Luc-Brun-CV-FR.pdf' : './Luc-Brun-CV.pdf'; });
    updateCount(); updateMotion(); write('luc-language', lang);
    window.dispatchEvent(new Event('luc:language'));
  }
  $('#language').addEventListener('click', () => setLanguage(lang === 'en' ? 'fr' : 'en'));
  function toggleMotion() {
    paused = !paused; write('luc-motion', paused ? 'paused' : 'running'); updateMotion();
    if (!paused) resumeNetwork(); else drawOnce();
  }
  $('#motion').addEventListener('click', toggleMotion);
  $('#map-motion').addEventListener('click', toggleMotion);
  $('#footer-motion').addEventListener('click', toggleMotion);
  reduced.addEventListener('change', e => { if (e.matches) { paused = true; updateMotion(); drawOnce(); } });
  setLanguage(lang);

  // Content remains visible if observers or JavaScript are unavailable.
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); } });
    }, { threshold: 0.06 });
    $$('.reveal').forEach(el => reveal.observe(el));
    document.documentElement.classList.add('js-ready');
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) $$('nav a').forEach(a => a.classList.toggle('current', a.hash === '#' + entry.target.id)); });
    }, { rootMargin: '-15% 0px -55% 0px' });
    $$('#research, #projects, #journey, #contact').forEach(s => navObserver.observe(s));
  }
  let scrollQueued = false;
  function progress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.reading-progress').style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    scrollQueued = false;
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(progress); } }, { passive: true });
  progress();
  const work = $$('.work-item');
  function filterWork(topic) {
    $$('.filter').forEach(b => { const active = b.dataset.filter === topic; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    visibleCount = 0;
    work.forEach(el => {
      el.hidden = topic !== 'all' && !el.dataset.topics.split(' ').includes(topic);
      if (!el.hidden) { visibleCount++; el.classList.add('visible'); }
    });
    const grid = $('.project-grid');
    const children = $$('.work-item', grid).filter(el => !el.hidden).length;
    grid.hidden = children === 0;
    grid.style.gridTemplateColumns = children === 1 ? '1fr' : '';
    updateCount(); progress();
    window.dispatchEvent(new CustomEvent('luc:filter', { detail: { topic } }));
  }
  $$('.filter').forEach(b => b.addEventListener('click', () => filterWork(b.dataset.filter)));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    if (['#publication', '#project-agents', '#project-gpt'].includes(a.hash)) filterWork('all');
    const target = a.hash && $(a.hash);
    if (target) target.classList.add('visible');
  }));
  const citation = 'Proskurina, I., Brun, L., Metzler, G., & Velcin, J. (2024). When Quantization Affects Confidence of Large Language Models? arXiv:2405.00632. https://arxiv.org/abs/2405.00632';
  $('#copy-citation').addEventListener('click', async () => {
    let copied = false;
    try { await navigator.clipboard.writeText(citation); copied = true; } catch {
      const field = document.createElement('textarea'); field.value = citation; field.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(field); field.select();
      try { copied = document.execCommand('copy'); } catch { /* fallback below */ }
      field.remove(); $('#copy-citation').focus();
    }
    const text = copied ? (lang === 'fr' ? 'Référence copiée' : 'Citation copied') : (lang === 'fr' ? 'Copie indisponible — la référence est dans la publication.' : 'Copy unavailable — citation is available in the paper.');
    $('#citation-status').textContent = text;
    $('#copy-citation').firstElementChild.textContent = text;
    setTimeout(() => { $('#copy-citation').firstElementChild.textContent = lang === 'fr' ? 'Copier la référence' : 'Copy citation'; }, 3500);
  });

  // The continuous network owns its renderer; content controls communicate by events.
  drawOnce = () => window.dispatchEvent(new Event('luc:motion'));
  resumeNetwork = drawOnce;
  addEventListener('luc:visit', event => {
    filterWork('all');
    const target = document.getElementById(event.detail.target);
    if (target) {
      target.classList.add('visible');
      target.scrollIntoView({ behavior: paused || reduced.matches ? 'instant' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
})();
