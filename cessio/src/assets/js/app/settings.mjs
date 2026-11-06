// Réglages : profils d'auteur, identité visuelle des documents, pourcentages par défaut, données.
import { h, toast, field, iconButton, icon, put } from '../ui.mjs';
import { can, planFor, limits } from '../plans.mjs';
import { paywall } from '../ui.mjs';
import { MODES } from '../core/pricing.mjs';
import { getSettings, saveSettings, getProfiles, saveProfiles } from '../core/store.mjs';
import config from '../config.mjs';

export function mountSettings(root) {
  function render() {
    const settings = getSettings();
    const profiles = getProfiles();
    if (!profiles.length) profiles.push({ name: '', status: '', siret: '', address: '', email: '', vatFranchise: false });
    const active = Math.min(settings.activeProfile || 0, profiles.length - 1);

    // Profils
    const profileFields = (p, i) => {
      const input = (label, key, extra = {}) => {
        const el = h('input', { class: 'input', value: p[key] || '', ...extra });
        el.addEventListener('change', () => {
          profiles[i][key] = el.value;
          saveProfiles(profiles);
          toast('Profil enregistré.', { type: 'ok', timeout: 1800 });
        });
        return field(label, el);
      };
      return h(
        'div',
        { class: `card profile${i === active ? ' active' : ''}` },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, p.name || `Profil ${i + 1}`),
          h('div', { class: 'row', style: { flex: 'none', gap: '6px' } },
            profiles.length > 1 && i !== active ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { saveSettings({ ...getSettings(), activeProfile: i }); render(); } }, 'Utiliser') : i === active && profiles.length > 1 ? h('span', { class: 'badge ok' }, 'Actif') : null,
            profiles.length > 1 ? iconButton('trash', 'Supprimer ce profil', () => { profiles.splice(i, 1); saveProfiles(profiles); saveSettings({ ...getSettings(), activeProfile: 0 }); render(); }, 'danger') : null,
          ),
        ),
        h('div', { class: 'grid-2' }, input('Nom ou nom d’artiste', 'name'), input('Statut', 'status'), input('SIRET', 'siret'), input('Adresse', 'address'), input('E-mail', 'email', { type: 'email' })),
      );
    };
    const addProfile = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'data-testid': 'add-profile' }, icon('plus', 16), 'Ajouter un profil d’auteur');
    addProfile.addEventListener('click', () => {
      if (!can('profiles', profiles.length + 1)) return paywall({ reason: 'Plusieurs profils d’auteurs (studio, collectif) sont inclus dans le plan Studio.', requiredPlan: planFor('profiles', profiles.length + 1) });
      profiles.push({ name: '', status: '', siret: '', address: '', email: '', vatFranchise: false });
      saveProfiles(profiles);
      render();
    });

    // Identité visuelle
    const logoInput = h('input', { type: 'file', accept: 'image/png,image/jpeg', hidden: true });
    logoInput.addEventListener('change', () => {
      const f = logoInput.files[0];
      if (!f) return;
      if (f.size > 400 * 1024) return toast('Logo trop lourd (400 Ko maximum).', { type: 'err' });
      const reader = new FileReader();
      reader.onload = () => {
        saveSettings({ ...getSettings(), logo: reader.result });
        render();
      };
      reader.readAsDataURL(f);
    });
    const color = h('input', { type: 'color', value: settings.accent || config.brand.accent, 'aria-label': 'Couleur des documents' });
    color.addEventListener('change', () => {
      if (!can('branding')) {
        color.value = config.brand.accent;
        return paywall({ reason: 'Votre couleur et votre logo sur les documents sont inclus dans le plan Solo.', requiredPlan: planFor('branding') });
      }
      saveSettings({ ...getSettings(), accent: color.value });
      toast('Couleur enregistrée.', { type: 'ok', timeout: 1800 });
    });
    const chooseLogo = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => (can('branding') ? logoInput.click() : paywall({ reason: 'Votre logo sur les documents est inclus dans le plan Solo.', requiredPlan: planFor('branding') })) }, settings.logo ? 'Changer le logo' : 'Ajouter mon logo');

    // Pourcentages
    const pct = h('div', { class: 'pct-grid' }, ...MODES.map((m) => {
      const el = h('input', { class: 'input', type: 'number', min: '0', max: '500', value: settings.percentages?.[m.id] ?? m.pct });
      el.addEventListener('change', () => {
        const s = getSettings();
        s.percentages = { ...(s.percentages || {}), [m.id]: Number(el.value) };
        saveSettings(s);
        toast('Pourcentage enregistré pour vos prochains contrats.', { type: 'ok', timeout: 2200 });
      });
      return h('label', { class: 'pct-row' }, h('span', {}, m.label), h('span', { class: 'pr-value' }, el, h('span', {}, '%')));
    }));

    put(root, 
      h('h2', {}, 'Réglages'),
      h('section', { class: 'settings-section' }, h('h3', {}, 'Profils d’auteur'), ...profiles.map(profileFields), limits().profiles > 1 || profiles.length >= 1 ? addProfile : null),
      h('section', { class: 'settings-section' },
        h('h3', {}, 'Identité visuelle de vos documents'),
        h('div', { class: 'row', style: { justifyContent: 'flex-start', flexWrap: 'wrap' } },
          settings.logo ? h('img', { src: settings.logo, alt: 'Votre logo', class: 'logo-preview' }) : null,
          chooseLogo,
          settings.logo ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { saveSettings({ ...getSettings(), logo: null }); render(); } }, 'Retirer') : null,
          h('label', { class: 'row', style: { flex: 'none', gap: '8px' } }, color, 'Couleur'),
          logoInput,
        ),
        !can('branding') ? h('p', { class: 'muted small' }, `Plan ${limits().planName} : documents aux couleurs de ${config.brand.name}, avec mention en pied de page.`) : null,
      ),
      h('section', { class: 'settings-section' },
        h('h3', {}, 'Pourcentages par usage (calcul suggéré)'),
        h('p', { class: 'muted small' }, 'Part du prix de création facturée pour chaque usage, avant coefficients de territoire, de durée et d’exclusivité. Ces valeurs s’appliquent aux nouveaux contrats ; les contrats existants gardent leurs montants.'),
        pct,
      ),
    );
  }
  render();
}
