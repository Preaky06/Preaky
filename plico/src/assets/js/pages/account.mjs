// Page Compte (et page Merci) : activation et gestion de la licence.
import config, { BILLING_READY } from '../config.mjs';
import { getLicense, activate, refresh, deactivate, forget, currentPlanId, onLicenseChange } from '../license.mjs';
import { h, toast, icon } from '../ui.mjs';

const maskKey = (key) => (key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : key);
const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function renderAccount(opts = {}) {
  const root = document.getElementById('account-root');
  if (!root) return;
  let autoDone = false;

  function activationCard(prefill = '') {
    const input = h('input', { class: 'input mono', placeholder: 'Collez votre clé de licence', value: prefill, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Clé de licence', 'data-testid': 'license-input' });
    const btn = h('button', { type: 'submit', class: 'btn btn-accent', 'data-testid': 'license-activate' }, 'Activer');
    const msg = h('p', { class: 'notice err', hidden: true, role: 'alert', 'data-testid': 'license-error', style: { marginTop: '12px' } });
    const form = h('form', { class: 'license-form' }, input, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = input.value.trim();
      if (key.length < 6) {
        msg.hidden = false;
        msg.textContent = 'Collez la clé de licence complète (e-mail de confirmation ou espace client).';
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      btn.disabled = true;
      btn.replaceChildren(h('span', { class: 'spinner' }), ' Vérification…');
      const r = await activate(key);
      btn.disabled = false;
      btn.textContent = 'Activer';
      if (r.ok) {
        toast(`Licence ${r.planName} activée. Bon travail !`, { type: 'ok' });
        render();
      } else {
        msg.hidden = false;
        msg.textContent = r.message || 'Activation impossible.';
        input.setAttribute('aria-invalid', 'true');
      }
    });
    if (opts.autoActivate && prefill && !autoDone) {
      autoDone = true;
      setTimeout(() => form.requestSubmit(), 50);
    }
    return h(
      'div',
      { class: 'card' },
      h('h2', {}, opts.thanks ? 'Activez votre licence' : 'Vous avez une licence ?'),
      h('p', { class: 'muted' }, 'Elle figure dans l’e-mail de confirmation de votre achat et dans votre espace client. Une seule saisie par appareil suffit.'),
      form,
      msg,
      config.billing?.customerPortalUrl ? h('p', { class: 'small', style: { marginTop: '12px', marginBottom: 0 } }, h('a', { href: config.billing.customerPortalUrl, target: '_blank', rel: 'noopener' }, 'Retrouver ma clé dans l’espace client →')) : null,
      h('p', { class: 'muted small', style: { marginTop: '14px', marginBottom: 0 } }, 'Pas encore de licence ? ', h('a', { href: '/tarifs' }, 'Voir les plans'), '.'),
    );
  }

  function planCard(s) {
    const plan = config.plans[currentPlanId()];
    const portal = config.billing?.customerPortalUrl;
    const recheck = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, icon('refresh', 16), 'Revérifier');
    recheck.addEventListener('click', async () => {
      recheck.disabled = true;
      const r = await refresh({ force: true });
      recheck.disabled = false;
      if (r?.ok) toast('Licence vérifiée : tout est en ordre.', { type: 'ok' });
      else toast(r?.message || 'Vérification impossible pour le moment.', { type: 'err' });
      render();
    });
    const off = h('button', { type: 'button', class: 'btn btn-danger btn-sm', 'data-testid': 'license-deactivate' }, 'Désactiver sur cet appareil');
    off.addEventListener('click', async () => {
      if (!confirm('Désactiver la licence sur cet appareil ? Vous pourrez la réactiver avec la même clé.')) return;
      off.disabled = true;
      await deactivate();
      toast('Licence désactivée sur cet appareil.');
      render();
    });
    const lim = s.activations?.limit;
    const activations = lim ? (s.activations.used != null ? `${s.activations.used} sur ${lim}` : `Jusqu’à ${lim}`) : 'Illimité';
    return h(
      'div',
      { class: 'card', 'data-testid': 'plan-card' },
      h('div', { class: 'plan-hero' }, h('div', {}, h('div', { class: 'muted small' }, 'Plan actuel'), h('div', { class: 'big', 'data-testid': 'plan-name' }, plan.name)), h('span', { class: 'privacy-chip' }, icon('check', 15), 'Licence active')),
      h(
        'dl',
        { class: 'kv', style: { marginTop: '22px' } },
        h('dt', {}, 'Clé'),
        h('dd', {}, maskKey(s.key)),
        s.email ? [h('dt', {}, 'E-mail'), h('dd', {}, s.email)] : null,
        h('dt', {}, 'Appareils'),
        h('dd', {}, activations),
        s.expiresAt ? [h('dt', {}, 'Expire le'), h('dd', {}, fmtDate(s.expiresAt))] : null,
        h('dt', {}, 'Dernière vérification'),
        h('dd', {}, fmtDate(s.lastSuccess)),
      ),
      h('div', { class: 'row', style: { flexWrap: 'wrap', marginTop: '22px', justifyContent: 'flex-start' } }, portal ? h('a', { class: 'btn btn-primary btn-sm', href: portal, target: '_blank', rel: 'noopener' }, 'Gérer mon abonnement') : null, recheck, off),
      h('p', { class: 'muted small', style: { margin: '16px 0 0' } }, `Hors connexion, la licence reste active ${config.license?.offlineGraceDays ?? 7} jours après la dernière vérification.`),
    );
  }

  function invalidCard(s) {
    const retry = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Réessayer');
    retry.addEventListener('click', async () => {
      await refresh({ force: true });
      render();
    });
    const drop = h('button', { type: 'button', class: 'btn btn-danger btn-sm' }, 'Oublier cette clé');
    drop.addEventListener('click', () => {
      forget();
      render();
    });
    return h('div', { class: 'card' }, h('h2', {}, 'Licence inactive'), h('p', { class: 'notice warn' }, s.error || 'Cette licence n’est plus valide.'), h('p', { class: 'muted small' }, `Clé : ${maskKey(s.key)}`), h('div', { class: 'row', style: { justifyContent: 'flex-start' } }, retry, drop));
  }

  function graceCard(s) {
    const retry = h('button', { type: 'button', class: 'btn btn-accent btn-sm' }, 'Revérifier maintenant');
    retry.addEventListener('click', async () => {
      const r = await refresh({ force: true });
      if (!r?.ok) toast(r?.message || 'Vérification impossible.', { type: 'err' });
      render();
    });
    return h('div', { class: 'card' }, h('h2', {}, 'Vérification nécessaire'), h('p', { class: 'notice warn' }, 'Votre licence n’a pas pu être vérifiée depuis plusieurs jours. Connectez-vous à Internet puis revérifiez.'), h('p', { class: 'muted small' }, `Clé : ${maskKey(s.key)}`), retry);
  }

  async function setupCard() {
    if (BILLING_READY) return null;
    const { billingStatus } = await import('../license-core.mjs');
    const status = billingStatus(config);
    return h(
      'div',
      { class: 'card', 'data-testid': 'setup-card' },
      h('h2', {}, 'Configuration du paiement'),
      h('p', { class: 'muted' }, 'Ce bloc s’affiche tant que le paiement n’est pas branché. Remplis ces champs dans site.config.mjs puis redéploie (guide complet : README.md).'),
      h('ul', { class: 'checklist' }, status.missing.map((m) => h('li', {}, '☐ ', h('code', {}, m)))),
    );
  }

  function localDataCard() {
    const clear = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Effacer les données locales');
    clear.addEventListener('click', () => {
      if (!confirm('Effacer la licence et la signature mémorisées dans ce navigateur ?')) return;
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('plico.'))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* rien à effacer */
      }
      forget();
      toast('Données locales effacées.');
      render();
    });
    return h('div', { class: 'card' }, h('h2', { style: { fontSize: '1.1rem' } }, 'Données sur cet appareil'), h('p', { class: 'muted small' }, 'Seules votre licence et, si vous l’avez demandé, votre signature sont conservées dans ce navigateur. Vos fichiers ne sont jamais stockés.'), clear);
  }

  async function render() {
    const s = getLicense();
    const cards = [];
    if (s?.status === 'active' && currentPlanId() !== 'free') cards.push(planCard(s));
    else if (s?.status === 'active') cards.push(graceCard(s), activationCard());
    else if (s?.status === 'invalid') cards.push(invalidCard(s), activationCard());
    else cards.push(activationCard(opts.prefill || ''));
    const setup = await setupCard();
    if (setup) cards.push(setup);
    if (!opts.thanks) cards.push(localDataCard());
    root.replaceChildren(...cards);
  }

  onLicenseChange(() => {
    if (!root.contains(document.activeElement)) render();
  });
  render();
}
