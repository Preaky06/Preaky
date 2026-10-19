# CinéMood — films publicitaires (30 s)

Films promotionnels pour [cinem00d.com](https://cinem00d.com), entièrement générés par code :
images calculées une à une dans Chromium (canvas 2D, flou de mouvement par sous-images),
bande-son composée en Python à partir d'instruments échantillonnés libres de droits,
encodage avec ffmpeg. Deux versions : **motion design typographique** (la plus récente)
et **film cinématographique** (néon, pellicule, interface), plus un carrousel, une vidéo UGC et un
**motion design explicatif du site** (44 s, interface réelle).

## Version motion design (typographie seule)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/cinemood-motion-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | YouTube, site, LinkedIn, écran |
| `out/cinemood-motion-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/couverture-motion-16x9.png`, `out/couverture-motion-9x16.png` | plan final | miniature / couverture |

Palette du site (rouge #ff2d4f, rose, noir, blanc cassé), Anton pour les titres, Archivo pour les
mentions. Son à −14 LUFS, vidéo en CRF 15.

| Temps | Plan | Transition vers le plan suivant |
| --- | --- | --- |
| 0–2 s | « TU PASSES 30:00 À CHERCHER QUOI REGARDER. » — compteur à rouleaux qui s'emballe puis se verrouille en rouge | double volet rose puis rouge |
| 2–4 s | SCROLLER. HÉSITER. SCROLLER. ABANDONNER. — un verbe par contretemps, échos en contour qui défilent | huit lamelles qui partent en alternance |
| 4–5,7 s | « ET SI ON PARTAIT DE TON MOMENT ? » | le point du « ? » enfle et s'ouvre en iris |
| 6–8 s | CINÉMOOD, lettre par lettre, soulignement rouge | plongée dans le creux du premier O |
| 8–10,5 s | « 12 QUESTIONS. » puis « TON HUMEUR, / CONTEXTE, / TEMPS. » en rouleau | poussée verticale |
| 10,5–12,5 s | les huit humeurs, une par croche, chacune sur son aplat | coupe sur la dernière |
| 12,5–14 s | « M'ÉVADER » entouré au feutre | l'ellipse se remplit de rouge et envahit l'écran |
| 14–16 s | « CINQ FILMS, CLASSÉS ET EXPLIQUÉS. » + les cinq résultats et leurs scores | la ligne n°1 grandit jusqu'à devenir l'écran |
| 16–18 s | anneau d'une minute : « EN UNE MINUTE. PAS TRENTE. » | l'anneau se resserre en point, le point devient un trait |
| 18–20 s | écran partagé : « DEUX HUMEURS. / UN SEUL FILM. » — mode duo | les deux moitiés se retirent |
| 20–21 s | « GRATUIT. » | on traverse le mot |
| 21–22,4 s | un formulaire d'inscription barré qui tombe : « SANS INSCRIPTION. » | volet vertical |
| 22,5–25,5 s | « LE FILM QUI COLLE À TON MOMENT. » | le texte s'écrase en une barre noire |
| 25,5–30 s | CINÉMOOD + adresse tapée dans sa pastille | fondu au noir |

Bande-son : électro sèche à 120 BPM en la mineur (TR-808, basse analogique, synthés pincés,
piano, cordes). La signature au piano la–do–mi–ré apparaît au premier logo et se résout sur le la
au logo final ; les lettres du logo montent chacune sur une note. La musique « abandonne » en même
temps que le mot ABANDONNER (ralentissement de bande). Chaque mouvement du texte a son bruitage,
calculé à partir de la même courbe d'animation que l'image : crans du compteur, souffle des rouleaux,
feutre de l'ellipse et des ratures, frappe des touches de l'adresse.

Reconstruire : `./build-motion.sh` (ou `./build-motion.sh 169` / `916`).
Aperçu : `PAGE=motion.html node render.mjs stills 1920 1080 /tmp/apercu 1.9 14.9 27.9`.

## Carrousel (Instagram, LinkedIn)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/carousel/cinemood-carrousel-01.png` … `-09.png` | 9 images 1080×1350 (4:5) | carrousel Instagram, Facebook |
| `out/carousel/cinemood-carrousel.pdf` | PDF de 9 pages 1080×1350, texte vectoriel | post « document » LinkedIn |
| `out/carousel/apercu-panorama.png` | les 9 slides bout à bout | aperçu du fil rouge |

Un fil rouge continu traverse les 9 slides : il souligne « 30:00 », barre « ABANDONNER. »,
souligne « TON MOMENT ? », relie les questions, choisit « M'ÉVADER », passe par le film n°1,
devient la séparation du mode duo, raye le formulaire d'inscription et finit en soulignement du logo.
Chaque bord de slide reprend le fil exactement là où la précédente l'a laissé.

Textes repris du site (questions, humeurs et sous-titres, étapes du parcours). La slide 6 montre
huit films, le nombre que le site renvoie en mode gratuit (`PRO_RESULTS = 8` dans moodflix-account.js).
Les titres de films et le « Pourquoi lui » sont des exemples fictifs, signalés par la pastille EXEMPLE.

Reconstruire : `node carousel/export.mjs` (source : `carousel/slides.html`).

## Vidéo UGC (enregistrement d'écran, 9:16)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/ugc/cinemood-ugc-9x16.mp4` | 1080×1920, 30 i/s, H.264 + AAC, 24 s | TikTok, Reels, Shorts (format « POV » sans visage) |
| `out/ugc/couverture-ugc.png` | image de l'accroche | couverture |

Le format imite un utilisateur qui filme son écran : accroche dans une appli de streaming générique
(« pov : ça fait 40 min que tu scrolles… »), saisie de l'adresse dans le navigateur, puis le **vrai
site** — page d'accueil, les 12 questions (M'évader → Un autre monde → L'espace → …), le chargement
et les résultats calculés par le moteur du site. Sous-titres façon TikTok, doigt visible, zooms de
montage, musique lo-fi qui s'ouvre quand le site apparaît.

Comment c'est fait : le site (archive fournie) tourne dans un Chromium mobile hors ligne ; les appels
à TMDB sont servis par un **catalogue fictif** (`ugc/catalog.mjs`, affiches générées par
`ugc/posters.mjs`). L'interface, les questions, le classement et les textes « Pourquoi lui » sont ceux
du site ; les films, eux, n'existent pas — d'où la mention « démo · titres fictifs » sur les résultats.
L'horloge, les animations CSS et le défilement sont pilotés image par image (`ugc/site.mjs`).

Reconstruire :

```bash
unzip cinem00d.zip -d /tmp/site              # l'archive du site
node ugc/posters.mjs /tmp/ugc-img
SITE_DIR=/tmp/site/site-simple IMG_DIR=/tmp/ugc-img node ugc/capture.mjs /tmp/ugc-raw
node ugc/compose.mjs /tmp/ugc-raw /tmp/ugc-final
python3 audio/score_ugc.py /tmp/ugc-raw/meta.json audio/music_ugc.wav
```

## Motion design du site (explainer, 44 s)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/explainer/cinemood-explainer-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | page d'accueil, YouTube, LinkedIn, présentation |
| `out/explainer/cinemood-explainer-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/explainer/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

Vidéo explicative construite sur **l'interface réelle de la version actuelle du site** (8 questions) :
captures haute définition (téléphone ×3, bureau ×1,5) animées dans le moteur de motion design. Le fil
conducteur est le temps : un chrono ouvre le film et revient à chaque étape.

| Temps | Plan |
| --- | --- |
| 0–5 s | « TU PASSES 30:00 À CHERCHER QUOI REGARDER. » sur un mur d'affiches qui défile ; le compteur se verrouille puis rembobine à 01:00 |
| 5–8 s | « ET SI ÇA PRENAIT UNE MINUTE ? » puis le titre du site, « TON HUMEUR CHOISIT TON CINÉMA », en néon |
| 8–11,3 s | raccord sur le même titre dans la vraie page d'accueil (navigateur ou téléphone), clic sur « Commencer », plongée dans le rouge |
| 11,3–18 s | **01 · TU DIS COMMENT TU TE SENS.** Les neuf tickets d'humeur ; « Rêveur » se détache, se déchire à la perforation ; puis les 7 questions qui suivent défilent dans le téléphone, compteur de questions et chrono à côté |
| 18–24 s | **02 · CHAQUE FILM EST VÉRIFIÉ DEUX FOIS.** Un tapis de 12 candidats passe deux portes (genres, puis mots-clés) ; un film très populaire est écarté ; « 8 FILMS PASSENT TES FILTRES. » |
| 24–30,4 s | **03 · TON MEILLEUR CHOIX, ET 4 AUTRES.** La vraie carte n°1 : score, jauges qui se remplissent, « Pourquoi lui » mis en évidence, puis les quatre alternatives |
| 30,4–36 s | « TA SOIRÉE, AVANT ET APRÈS. » : deux frises de 21:00 à 21:40, 30 min de recherche contre 1 min ; « 29 MINUTES DE FILM EN PLUS. » |
| 36–40 s | MODE DUO (« DEUX HUMEURS. UN SEUL FILM. »), GRATUIT., SANS INSCRIPTION. |
| 40–44 s | logo, titre en néon, adresse tapée dans sa pastille, « 8 QUESTIONS · UNE MINUTE · GRATUIT, SANS INSCRIPTION » |

Les films et affiches sont fictifs (catalogue de `ugc/catalog.mjs`), ce que dit la mention finale. Le
« Pourquoi lui » du site produit « mêlé à la aventure » pour ce couple de genres : la capture le corrige
en « mêlée d’aventure » (`explainer/capture.mjs`) ; la faute reste à corriger dans `moodflix-tmdb.js`.

Bande-son : électro à 120 BPM, chaque mouvement bruité à partir des temps de l'animation (crans du
compteur, rembobinage, grésillement du néon, clic, déchirure du ticket, passages aux portes, remplissage
des jauges, frappe de l'adresse). −14 LUFS, crête vraie −1,5 dBTP.

Reconstruire : `./build-explainer.sh cinem00d.zip` (ou `… 169` / `… 916`).
Aperçu : `PAGE=explainer.html TEX_DIR=… IMG_DIR=… node render.mjs stills 1920 1080 /tmp/apercu 3 13.6 25.8 33`.

## Version cinématographique

### Fichiers livrés

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/cinemood-pub-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | YouTube, site, LinkedIn, écran |
| `out/cinemood-pub-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/couverture-16x9.png`, `out/couverture-9x16.png` | image fixe du plan final | miniature / couverture de publication |

Son normalisé à −14 LUFS (niveau de référence des plateformes sociales).
Vidéo encodée en CRF 15 : un master riche qui encaisse mieux la recompression des plateformes.

### Découpage et transitions (120 BPM : 1 temps = 0,5 s)

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

### Son

Composition originale en la mineur ; le motif de piano (la–do–mi–ré) revient trois fois
et se résout sur le la au logo. Bruitages conçus en couches : pluie, transformateur et relais
du néon, claquement de griffe et moteur du projecteur, whooshes à effet Doppler, cymbales
inversées, impacts (taiko, timbales, 808, sous-grave), ralentissement de bande.

## Crédits des sons (toutes les vidéos — à reprendre dans la description de la publication)

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

- `src/motion.html`, `src/motion.js` — version motion design : scènes typographiques, transitions, montage
- `audio/score_motion.py` — bande-son et bruitages de la version motion design
- `build-motion.sh` — construction de la version motion design
- `src/explainer.html`, `src/explainer.js` — motion design du site (explainer) : scènes, captures animées, montage
- `explainer/capture.mjs` — captures haute définition de l'interface réelle (site hors ligne)
- `audio/score_explainer.py` — bande-son et bruitages de l'explainer
- `build-explainer.sh` — construction de l'explainer
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
