// Création d'archives ZIP (fflate), sans recompression : PDF/PNG/JPG sont déjà compressés.
export async function zipBlob(entries) {
  const { zipSync } = await import('../vendor/fflate/fflate.mjs');
  const files = {};
  const used = new Set();
  for (const { name, bytes } of entries) {
    let n = name;
    let i = 2;
    while (used.has(n.toLowerCase())) n = name.replace(/(\.[^.]+)?$/, ` (${i++})$1`);
    used.add(n.toLowerCase());
    files[n] = [bytes, { level: 0 }];
  }
  return new Blob([zipSync(files)], { type: 'application/zip' });
}
