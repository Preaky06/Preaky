// Installation sur l'écran d'accueil (PWA).
let deferred = null;

addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;
});

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const hasManifest = () => !!document.querySelector('link[rel="manifest"]');

export const canPrompt = () => !!deferred;
export const available = () => hasManifest() && !isStandalone() && (canPrompt() || isIOS());

export function hint() {
  if (isIOS()) return 'Sur iPhone : touche le bouton Partager de Safari, puis « Sur l’écran d’accueil ». L’appli marche ensuite même sans connexion.';
  return 'Ajoute Preaky Mind à ton écran d’accueil : elle s’ouvre en plein écran et marche même sans connexion.';
}

export async function prompt() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice.catch(() => null);
  deferred = null;
  return choice?.outcome === 'accepted';
}
