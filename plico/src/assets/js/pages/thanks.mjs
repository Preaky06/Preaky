import renderAccount from './account.mjs';

export default function thanks() {
  const params = new URLSearchParams(location.search);
  const key = params.get('license_key') || params.get('key') || '';
  renderAccount({ prefill: key, autoActivate: !!key, thanks: true });
}
