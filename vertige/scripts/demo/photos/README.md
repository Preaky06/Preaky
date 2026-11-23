# Photos des objets (Wikimedia Commons)

1. `scripts/demo/photo-sources.json` : objet → article Wikipédia (image Wikidata P18, drapeau P41 ou logo P154).
2. `fetch.py` : titres → entités Wikidata → fichiers Commons → auteur, licence (libres uniquement), miniature standard.
   - `LINKS=1` : n'écrit que les liens (miniatures 500 et 960 px) dans `links.json`, sans rien télécharger.
   - `OFFLINE=1` : n'utilise que les réponses en cache.
   - Sans `LINKS`, télécharge les miniatures (contact obligatoire dans `VG_CONTACT`, politique Wikimedia) pour `cutout.py` (détourage rembg) et `sheet.py` (planches de contrôle).
3. Les liens retenus après relecture vont dans `scripts/demo/photos.json`, lu par `npm run demo:build`.

Le site affiche les miniatures directement depuis `upload.wikimedia.org` ; si l'une ne charge pas
(réseau, page qui bloque les images externes comme l'aperçu claude.ai), l'illustration 3D la remplace
(`data-fallback`, `components/layout/ImageFallback.tsx`).

Prérequis : `python3 -m venv venv && ./venv/bin/pip install "rembg[cpu]" pillow requests`.
