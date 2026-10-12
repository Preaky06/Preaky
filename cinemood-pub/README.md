# CinéMood — film publicitaire (30 s)

Film promotionnel pour [cinem00d.com](https://cinem00d.com), entièrement généré par code :
images calculées une à une dans Chromium (canvas 2D), bande-son synthétisée en Python,
montage et encodage avec ffmpeg. Aucune image, vidéo, police ou son tiers hormis les
polices du site (Anton et Archivo, licence SIL OFL).

## Fichiers livrés

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/cinemood-pub-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | YouTube, site, LinkedIn, écran |
| `out/cinemood-pub-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/couverture-16x9.png`, `out/couverture-9x16.png` | image fixe du plan final | miniature / couverture de publication |

Son normalisé à −14 LUFS (niveau de référence des plateformes sociales), crête vraie −3,2 dBTP.
Vidéo encodée en CRF 15 (≈ 10,5 Mb/s) : un master riche qui encaisse mieux la recompression des plateformes.

## Découpage (120 BPM : 1 temps = 0,5 s)

| Temps | Plan | Texte à l'écran |
| --- | --- | --- |
| 0–2 s | Une enseigne néon « CINÉMA » s'allume sur un mur de briques, le É grésille comme sur le site | — |
| 2–6 s | Mur infini d'affiches qui défile, chrono qui s'emballe | « Tu passes 30 minutes à chercher quoi regarder. » |
| 6–8 s | Les bandes cinéma s'ouvrent, faisceau de projecteur | « On part de ton moment. » |
| 8–10 s | L'interface réelle du quiz | « Ce soir, il te faut quoi ? » |
| 10–14 s | Les 8 humeurs du site, une par temps, chacune avec son univers | Rire, Avoir peur, Être ému… M'évader |
| 14–17 s | Le parcours en accéléré, questions 02 à 12 | Questions et réponses du site |
| 17–18 s | Le catalogue filtré (globe de points) | Les 4 lignes de chargement du site |
| 18–22 s | La page de résultats, score qui monte, « Pourquoi lui » | « Cinq films, classés et expliqués. » |
| 22–26 s | Arguments | 12 questions · Mode Duo · Gratuit · Sans inscription |
| 26–30 s | Le A de CINÉMA grille, « MOOD » s'allume : CINÉMOOD | « Le film qui colle à ton moment, en une minute. » + cinem00d.com |

Tous les textes de l'interface (questions, réponses, lignes de chargement, « Pourquoi lui »,
les 7 critères) reprennent le code du site. Les titres de films des résultats
(« L'Écho des étoiles », etc.) et leurs affiches sont **fictifs** : les vraies affiches TMDB
sont protégées et n'auraient pas pu être utilisées dans une publicité.

## Reconstruire

```bash
npm install playwright@1.56.1          # Chromium déjà présent dans l'environnement
pip install numpy scipy pyloudnorm
./build.sh                             # ou ./build.sh 169 / ./build.sh 916
```

Pour modifier un texte ou un timing : `src/scenes.js` (découpage, `TIMELINE`, textes),
`src/ui.js` (interface), `audio/synth.py` (musique ; les temps y sont les mêmes).
Aperçu d'images fixes : `node render.mjs stills 1920 1080 /tmp/apercu 9.2 19.6 28.5`.

## Structure

- `src/engine.js` — moteur : typographie cinétique, néon, bloom, grain, aberration chromatique, caméra, panneau 3D
- `src/assets.js` — textures procédurales (mur de briques, vignettes, affiches fictives)
- `src/ui.js` — reproduction de l'interface de cinem00d.com
- `src/scenes.js` — les 10 scènes et les effets globaux
- `render.mjs` — rendu image par image (Playwright)
- `audio/synth.py` — bande-son (synthèse soustractive, réverbération à convolution, mixage, normalisation)
