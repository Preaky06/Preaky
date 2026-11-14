// Point d'entrée commun à toutes les pages.
import config from './config.mjs';
import { currentPlanId, onLicenseChange, refresh, getLicense } from './license.mjs';
import { toast } from './ui.mjs';

function renderPlanBadges() {
  const id = currentPlanId();
  const name = config.plans[id]?.name ?? 'Gratuit';
  document.querySelectorAll('[data-plan-badge]').forEach((el) => {
    el.textContent = name;
    el.classList.toggle('paid', id !== 'free');
  });
  document.querySelectorAll('[data-free-only]').forEach((el) => (el.hidden = id !== 'free'));
  document.documentElement.dataset.plan = id;
}

function setupNav() {
  const body = document.body;
  const toggle = document.querySelector('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = !body.classList.contains('nav-open');
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  const group = document.querySelector('.nav-group');
  const btn = document.querySelector('.nav-tools-btn');
  if (!group || !btn) return;
  const set = (open) => {
    group.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    set(!group.classList.contains('open'));
  });
  document.addEventListener('click', (e) => {
    if (!group.contains(e.target)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      set(false);
      body.classList.remove('nav-open');
    }
  });
}

async function mountPage() {
  const page = document.body.dataset.page;
  try {
    if (page === 'app') (await import('./app/main.mjs')).default();
    if (page === 'calculator') (await import('./app/calculator.mjs')).default();
    if (document.querySelector('.billing-toggle')) (await import('./pages/pricing.mjs')).setupPricing();
    if (page === 'account' || page === 'thanks') (await import(`./pages/${page}.mjs`)).default();
  } catch (e) {
    console.error(e);
    const root = document.getElementById('app-root') || document.getElementById('calc-root');
    if (root) root.innerHTML = '<p class="notice err">Impossible de charger l’application. Rechargez la page (Ctrl+F5).</p>';
  }
}

renderPlanBadges();
onLicenseChange(renderPlanBadges);
setupNav();
mountPage();

// Revérification périodique de la licence (silencieuse sauf si elle devient invalide)
if (getLicense()) {
  refresh().then((r) => {
    if (r && !r.ok && ['invalid_key', 'inactive', 'wrong_product'].includes(r.code)) {
      toast(`Licence désactivée : ${r.message}`, { type: 'err', timeout: 9000 });
    }
  });
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
