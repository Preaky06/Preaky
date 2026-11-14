// Comportement des grilles tarifaires (page Tarifs et accueil).
import config, { BILLING_READY } from '../config.mjs';
import { currentPlanId } from '../license.mjs';
import { toast } from '../ui.mjs';

export function setupPricing() {
  const toggle = document.querySelector('.billing-toggle');
  if (!toggle) return;
  let period = 'monthly';
  const apply = () => {
    toggle.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.period === period;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('[data-price-monthly]').forEach((el) => (el.hidden = period !== 'monthly'));
    document.querySelectorAll('[data-price-yearly]').forEach((el) => (el.hidden = period !== 'yearly'));
    const current = currentPlanId();
    document.querySelectorAll('[data-checkout]').forEach((a) => {
      const id = a.dataset.checkout;
      const plan = config.plans[id];
      const url = plan?.checkout?.[period] || plan?.checkout?.monthly || plan?.checkout?.yearly || '';
      if (current === id) {
        a.textContent = 'Votre plan actuel';
        a.href = '/compte';
        a.removeAttribute('aria-disabled');
        return;
      }
      a.textContent = `Choisir ${plan.name}`;
      if (url) {
        a.href = url;
        a.removeAttribute('aria-disabled');
        a.rel = 'noopener';
      } else {
        a.href = '#';
        a.setAttribute('aria-disabled', 'true');
      }
    });
  };
  toggle.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-period]');
    if (!b) return;
    period = b.dataset.period;
    apply();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-checkout][aria-disabled="true"]');
    if (!a) return;
    e.preventDefault();
    toast('Le paiement en ligne ouvre très bientôt. Écrivez-nous pour un accès anticipé : ' + config.contactEmail);
  });
  apply();

  const wanted = new URLSearchParams(location.search).get('plan');
  const card = wanted && document.querySelector(`.plan-card[data-plan="${CSS.escape(wanted)}"]`);
  if (card) {
    card.style.outline = '3px solid var(--accent)';
    card.style.outlineOffset = '4px';
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  const warning = document.querySelector('[data-billing-warning]');
  if (warning && !BILLING_READY) {
    warning.hidden = false;
    warning.textContent = 'Le paiement en ligne est en cours de mise en place. Les plans payants seront disponibles très prochainement.';
  }
}

export default setupPricing;
