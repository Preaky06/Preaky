# CinéMood — film publicitaire (30 s)

Film promotionnel pour [cinem00d.com](https://cinem00d.com), entièrement généré par code :
images calculées une à une dans Chromium (canvas 2D, flou de mouvement par sous-images),
bande-son composée en Python à partir d'instruments échantillonnés libres de droits,
montage et encodage avec ffmpeg.

## Fichiers livrés

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/cinemood-pub-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | YouTube, site, LinkedIn, écran |
| `out/cinemood-pub-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/couverture-16x9.png`, `out/couverture-9x16.png` | image fixe du plan final | miniature / couverture de publication |

Son normalisé à −14 LUFS (niveau de référence des plateformes sociales).
Vidéo encodée en CRF 15 : un master riche qui encaisse mieux la recompression des plateformes.

## Découpage et transitions (120 BPM : 1 temps = 0,5 s)

| Temps | Plan | Transition vers le plan suivant |
| --- | --- | --- |
| 0–2 s | Enseigne néon « CINÉMA » sous la pluie, reflet ondulé sur le sol mouillé | l'enseigne court-circuite et s'éteint sur le temps |
| 2–5,6 s | Mur d'affiches qui défile, chrono qui s'emballe : « Tu passes 30 minutes à chercher quoi regarder. » | la caméra plonge dans le creux du « 0 » de 30 |
| 6–7,7 s | « On part de ton moment. » sous le faisceau d'un projecteur | panoramique vertical : le faisceau descend sur l'écran |
| 8–10 s | L'interface du site : « Ce soir, il te faut quoi ? » | plongée dans la carte « Rire » |
| 10–13,7 s | Les 8 humeurs sur une pellicule 35 mm rétroéclairée, une image tirée par temps | l'image « M'évader » rétrécit et redevient la carte 06 |
| 14–17 s | Le parcours en accéléré, questions 02 à 12 | poussées latérales à chaque question ; l'écran se replie en un point |
| 17–18 s | Le catalogue mondial filtré (globe de points) | silence, puis onde de choc |
| 18–22 s | Les résultats : score, « Pourquoi lui », « Cinq films, classés et expliqués. » | plongée dans le rouge du « I » d'EXPLIQUÉS |
| 22–26 s | Arguments en aplats : 12 questions · Deux humeurs, un seul film · Gratuit · Sans inscription | coupure nette, la musique s'arrête |
| 26–30 s | Le A de CINÉMA grille, « MOOD » s'allume : CINÉMOOD + cinem00d.com | fondu au noir |

Les textes de l'interface reprennent le code du site. Les titres de films des résultats
(« L'Écho des étoiles », etc.) et leurs affiches sont **fictifs**.

## Son

Composition originale en la mineur ; le motif de piano (la–do–mi–ré) revient trois fois
et se résout sur le la au logo. Bruitages conçus en couches : pluie, transformateur et relais
du néon, claquement de griffe et moteur du projecteur, whooshes à effet Doppler, cymbales
inversées, impacts (taiko, timbales, 808, sous-grave), ralentissement de bande.

### Crédits des sons (à reprendre dans la description de la publication)

- Piano : *Salamander Grand Piano V3* par Alexander Holm — licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- Cordes, chœur, taiko, timbales : *FluidR3 GM* par Frank Wen — licence MIT
- Boîte à rythmes : échantillons de Roland TR-808 enregistrés par Michael Fischer — diffusion libre
- Sons d'interface : *UI SFX* par Romain Simon — CC0

Mention courte possible : « Musique originale. Piano : Salamander Grand Piano, Alexander Holm (CC BY 3.0). »

## Reconstruire

```bash
npm install                 # Playwright + banques de sons
pip install numpy scipy pyloudnorm
./build.sh                  # ou ./build.sh 169 / ./build.sh 916
```

Aperçu d'images fixes : `node render.mjs stills 1920 1080 /tmp/apercu 9.2 19.6 28.5`.

## Structure

- `src/engine.js` — moteur : typographie cinétique, néon, bloom, grain, aberration chromatique, caméra, panneau 3D
- `src/assets.js` — textures procédurales (mur de briques, vignettes, affiches fictives)
- `src/ui.js` — reproduction de l'interface de cinem00d.com
- `src/scenes.js` — scènes (néon, scroll, projecteur, quiz, catalogue, résultats, logo)
- `src/gate.js` — la pellicule 35 mm des humeurs
- `src/features.js` — les arguments en aplats
- `src/edit.js` — montage, transitions, flou de mouvement, effets globaux
- `src/index.html` — boucle de rendu (sous-images accumulées en flottant)
- `render.mjs` — rendu image par image (Playwright)
- `audio/samples.py` — échantillonneur (piano, GM, 808, UI)
- `audio/dsp.py` — traitement du signal et bruitages
- `audio/score.py` — partition, sound design et mixage
