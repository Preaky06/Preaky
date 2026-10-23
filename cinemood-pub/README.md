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

### Version « 7 questions » (30 s, site du 20 octobre, build f)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/motion-7-questions/cinemood-motion-7-questions-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | YouTube, site, LinkedIn, écran |
| `out/motion-7-questions/cinemood-motion-7-questions-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/motion-7-questions/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

Mêmes plans, même musique ; ce qui change (`src/motion7.js`, qui s'appuie sur `motion.js`) :

| Temps | Avant (motion.js) | Version 7 questions |
| --- | --- | --- |
| 8–9 s | « 12 QUESTIONS. » (compteur 1 → 12) | compte à rebours 12 → 7 : « 7 QUESTIONS. AU LIEU DE 12. » |
| 9–11,5 s | « TON HUMEUR, / CONTEXTE, / TEMPS. » | « LES 7 QUESTIONS » : ton humeur, ton envie, ton seuil, ton public, ton temps, ton époque, connu ou découverte ? (une ligne par croche ; deux colonnes en 16:9) |
| 11,5–13,75 s | 8 humeurs (des verbes : rire, m'évader…) | les 9 humeurs du site, de HEUREUX à RÊVEUR, sous « COMMENT TU TE SENS CE SOIR ? » |
| 13,75–15 s | « M'ÉVADER » entouré | « RÊVEUR » entouré, « 09 — LA TÊTE AILLEURS » |
| 15–17,2 s | cinq titres inventés | les cinq films du parcours capturé (Les Cartographes 90 %, Cap sur l'Aurore 89 %…) |

La liste prend une seconde de plus : à partir des résultats, tout passe une seconde plus tard
(deux temps : la grille reste sur le tempo) et la signature finale est tenue une seconde de moins.
Bande-son : `python3 audio/score_motion.py sortie.wav --v7` (sans l'option : la version d'origine, inchangée).

Reconstruire : `./build-motion7.sh` (ou `… 169` / `… 916`).

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
ffmpeg -framerate 30 -i /tmp/ugc-final/u%05d.png -i audio/music_ugc.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -aac_pns 0 -aac_is 0 -ar 48000 -shortest -movflags +faststart out/ugc/cinemood-ugc-9x16.mp4
```

## Nouvelle version : 8 questions au lieu de 12 (18 s)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/nouvelle-version/cinemood-nouvelle-version-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | annonce : site, YouTube, LinkedIn |
| `out/nouvelle-version/cinemood-nouvelle-version-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/nouvelle-version/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

Mise en scène produit de l'interface réelle (captures de la version du 20 octobre) : téléphone en 3D
(projection orthographique, chaque surface est une transformation affine exacte), vue éclatée, ruban.

| Temps | Plan |
| --- | --- |
| 0–2 s | AVANT : l'ancienne interface en gris (liste, compteur sur 12), « 12 QUESTIONS. » ; un trait rouge barre le 12 ; le téléphone se retourne |
| 2–3 s | MAINTENANT : la nouvelle interface (tickets), « 8 QUESTIONS. au lieu de 12 · nouvelle interface » |
| 3–7 s | « PLUS CLAIRE. PLUS RAPIDE. » : vue éclatée de l'écran (en-tête, compteur 01 / 8, question, tickets) avec légendes ; la liste soulevée défile jusqu'à Rêveur, qu'on choisit |
| 7–10 s | « 01 / 8 … 08 / 8 — 8 QUESTIONS. MOINS D'UNE MINUTE. » : les huit vrais écrans en ruban, la caméra les passe en revue |
| 10–13,5 s | chargement, puis « TON MEILLEUR CHOIX + 4 AUTRES. » : la carte n°1 se détache (jauges qui se remplissent, 96 %), les quatre autres en éventail |
| 13,5–18 s | la nouvelle page d'accueil (boutons empilés), CINÉMOOD, « TON HUMEUR CHOISIT TON FILM. », adresse tapée, appui sur « Commencer » |

Bande-son (`audio/score_launch.py`) : avant le retournement, un rythme filtré, comme derrière une porte ;
au retournement tout s'ouvre. Une note par écran du ruban, aux mêmes instants que le compteur. −14 LUFS.
Les scènes sont écrites sur 23,5 s ; `LWARP` (launch.js) et `W()` (score_launch.py) les rejouent sur 18 s par morceaux,
l'impact du retournement tombant à 2,0 s et les coupes sur des temps.

Reconstruire : `./build-launch.sh cinem00d.zip` (ou `… 169` / `… 916`).

## 7 questions : la nouvelle interface et les nouvelles questions (20,5 s)

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/7-questions/cinemood-7-questions-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | annonce : site, YouTube, LinkedIn |
| `out/7-questions/cinemood-7-questions-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/7-questions/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

D'après le site du 20 octobre, build f (« 7 questions plus larges : question de précision retirée ; durée,
époque, notoriété en grands choix ») : le compteur va de 01 / 7 à 07 / 7. L'écran réel reste de face et en grand ;
chaque question passe avec son texte en entier ; un projecteur (fond assombri, contour rouge) désigne les nouveautés.
Les vidéos plus anciennes (« 8 questions ») décrivent la version précédente du site.

| Temps | Plan |
| --- | --- |
| 0–1,7 s | « NOUVELLE VERSION · 7 QUESTIONS. Des choix plus simples, une interface plus claire. » ; appui sur « Commencer » |
| 1,7–4,4 s | 01 / 7 « Comment tu te sens ce soir ? » (la liste défile jusqu'à Rêveur) ; 02 / 7 « Tu as envie de partir où ? » → Dans l'espace |
| 4,4–7,2 s | zoom sur le rappel des réponses : « TES RÉPONSES RESTENT AFFICHÉES. » ; puis sur le nouveau bouton : « PAS SÛR ? TU PASSES. » (« Je sais pas · Passer ») |
| 7,2–9,5 s | 03 / 7 « Tu te sens prêt à être secoué comment ? » → Un peu ; 04 / 7 « Tu regardes avec qui ? » → À deux |
| 9,5–14,6 s | les trois questions simplifiées (étiquette « PLUS SIMPLE »), leurs choix écrits en grand : durée, époque, connu ou découverte |
| 14,6–17,25 s | « TON MEILLEUR CHOIX, 90 % » (jauges, score désigné), puis les 4 autres films |
| 17,25–20,5 s | page d'accueil, CINÉMOOD, « TON HUMEUR CHOISIT TON CINÉMA. » (formule du site), adresse tapée, appui sur « Commencer » |

Bande-son (`audio/score_sept.py`) : une note par question (montante), un clic par appui, un signal par zone désignée. −14 LUFS.
Captures : `explainer/capture.mjs` reconnaît la version à 7 questions (compteur « / 7 ») et prend en plus la liste
des humeurs entière, le bas de l'écran (bouton « Je sais pas ») et la position du rappel des réponses.

Reconstruire : `./build-sept.sh cinem00d.zip` (ou `… 169` / `… 916`).

## Version 15 s, textes du site du 20 octobre

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/motion-design-15s/cinemood-15s-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories, publicité |
| `out/motion-design-15s/cinemood-15s-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | pré-roll, LinkedIn, site |
| `out/motion-design-15s/couverture-9x16.png`, `couverture-16x9.png` | plan final | miniature / couverture |

Écrite sur les nouveaux textes du site (build 2026-10-20-b) : le titre « Ton humeur choisit ton film » et
la description « Heureux, triste, amoureux, crevé ? Dis comment tu te sens : CinéMood te trouve le film qui
va avec. Ton meilleur choix + 4 autres, en une minute. Gratuit, sans inscription. »

| Temps | Plan |
| --- | --- |
| 0–3 s | HEUREUX ? TRISTE ? AMOUREUX ? CREVÉ ? — un visage et une couleur par temps, puis « TON HUMEUR CHOISIT TON FILM. » |
| 3–5 s | « DIS COMMENT TU TE SENS. » : les neuf humeurs, on choisit Rêveur |
| 5–7 s | « ON TE TROUVE LE FILM QUI VA AVEC. » : les affiches passent les deux portes, 5 restent |
| 7–9,5 s | « TON MEILLEUR CHOIX + 4 AUTRES. » : la carte n°1, puis lecture |
| 9,5–10,75 s | « EN UNE MINUTE. » : le chrono fait le tour |
| 10,75–11,75 s | « GRATUIT. SANS INSCRIPTION. » |
| 11,75–15 s | CINÉMOOD, « TON HUMEUR CHOISIT TON FILM. », adresse tapée, mur d'affiches |

Code : `src/s15.js` (accroche, minute, table de montage, textes remplacés via `TXT` de `mograph.js`),
`audio/score_15.py`. Reconstruire : `./build-15.sh` (ou `169` / `916`).

## Version courte (19 s), avec affiches

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/motion-design-court/cinemood-court-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | pré-roll, LinkedIn, site |
| `out/motion-design-court/cinemood-court-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories, publicité |
| `out/motion-design-court/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

Les scènes du motion design vectoriel (ci-dessous), rejouées 1,6 à 2,8 fois plus vite selon les passages
(`src/short.js`) : les textes clés gardent environ une seconde de lecture, les transitions vont le plus vite.
Chaque scène dure un nombre entier de quarts de seconde, les coupes tombent sur la musique
(2,5 / 5 / 7 / 9,5 / 11,5 / 13,75 / 16,25 s). Le Duo est coupé ; « gratuit, sans inscription » reste dans
le plan final. Les affiches sont des images (les 46 affiches fictives de `ugc/posters.mjs`) : catalogue
qui défile, films qui passent les portes, résultat, mur d'affiches derrière le logo.

Bande-son (`audio/score_short.py`) : grille fixe à 120 BPM ; chaque bruitage de `score_mograph.py` est
reporté par la même table de temps que l'image. −14 LUFS.

Reconstruire : `./build-short.sh` (ou `169` / `916`).

## Motion design vectoriel (41 s) — la version de référence

| Fichier | Format | Usage |
| --- | --- | --- |
| `out/motion-design/cinemood-motion-design-16x9.mp4` | 1920×1080, 60 i/s, H.264 + AAC | page d'accueil, YouTube, LinkedIn, présentation |
| `out/motion-design/cinemood-motion-design-9x16.mp4` | 1080×1920, 60 i/s, H.264 + AAC | Reels, TikTok, Shorts, Stories |
| `out/motion-design/couverture-16x9.png`, `couverture-9x16.png` | plan final | miniature / couverture |

Tout est dessiné en formes vectorielles, sans capture d'écran : horloge, visages des neuf humeurs,
cartes de questions, portes du tri, affiches, carte de résultat. Les textes (humeurs, questions,
réponses, « Pourquoi lui ») sont ceux du site. Chaque plan se transforme en le suivant.

| Temps | Plan | Passage au plan suivant |
| --- | --- | --- |
| 0–5 s | « ON REGARDE QUOI CE SOIR ? » : le catalogue défile de plus en plus vite, l'aiguille fait une demi-heure, « 30 MIN PLUS TARD… TOUJOURS RIEN. », les affiches tombent | l'aiguille rembobine jusqu'à 21:01 |
| 5–8,75 s | « ET SI ÇA PRENAIT 1 MINUTE ? » | l'horloge devient le premier O de CINÉMOOD ; on plonge dans le second O |
| 8,75–12,9 s | **Étape 1** « COMMENT TU TE SENS CE SOIR ? » : les neuf visages, on choisit Rêveur | le rouge du choix envahit l'écran et devient le premier point de progression |
| 12,9–19,2 s | **Étape 2** « 7 QUESTIONS RAPIDES. » : les vraies questions en cartes, une réponse par temps, chrono « moins d'une minute » ; « 8 RÉPONSES. C'EST TOUT. » | les huit points se rejoignent et ouvrent le noir |
| 19,2–23,8 s | **Étape 3** « CHAQUE FILM EST VÉRIFIÉ DEUX FOIS. » : 22 affiches passent les portes genres puis mots-clés (un « TOP 10 » est écarté), 5 restent | les cinq affiches glissent à leur place dans le résultat |
| 23,8–28,55 s | **Étape 4** « TON FILM, ET POURQUOI LUI. » : carte n°1, 96 %, « Pourquoi lui », quatre alternatives | lecture : l'affiche devient l'écran |
| 28,55–33,6 s | « LE TEMPS GAGNÉ » : deux horloges, 30 min à chercher contre 1 min, puis le film ; « 29 MINUTES DE FILM EN PLUS. » | les horloges deviennent deux visages |
| 33,6–36,9 s | « MODE DUO · DEUX HUMEURS. UN SEUL FILM. », puis « GRATUIT. SANS INSCRIPTION. » | volet noir |
| 36,9–41 s | CINÉMOOD, « TON HUMEUR CHOISIT TON CINÉMA. », adresse tapée | fondu |

Bande-son (`audio/score_mograph.py`) : la mineur → do majeur à 120 BPM ; tic-tac et défilement qui
s'emballent, retour en arrière, piano de la promesse, groove sous les quatre étapes (chaque humeur et
chaque réponse sonne une note, chaque porte valide ou refuse), respiration sur le temps gagné,
accord final. −14 LUFS.

Reconstruire : `./build-mograph.sh` (ou `./build-mograph.sh 169` / `916`).
Aperçu : `PAGE=mograph.html node render.mjs stills 1920 1080 /tmp/apercu 3.3 9.6 16.6 21.4 26.9 31.5`.

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
des jauges, frappe de l'adresse). −14 LUFS, crête vraie −1,3 dBTP après encodage.

Encodage AAC : `-aac_pns 0 -aac_is 0` dans tous les scripts. Avec les réglages par défaut, l'encodeur AAC
de ffmpeg remplaçait certains transitoires bruités (déchirure, impacts) par des pics parasites jusqu'à
+1,8 dBFS, audibles comme des clics ; la piste son des vidéos précédentes a été réencodée de la même façon.

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
- `src/mograph.html`, `src/mograph.js` — motion design vectoriel : formes, scènes, transitions, montage
- `src/short.html`, `src/short.js` — version courte : table de morceaux accélérés, affiches en image
- `src/s15.html`, `src/s15.js`, `audio/score_15.py`, `build-15.sh` — version 15 s sur les textes du site du 20 octobre
- `src/launch.html`, `src/launch.js`, `audio/score_launch.py`, `build-launch.sh`, `assets/launch/` — film « nouvelle version » (8 questions au lieu de 12)
- `audio/score_short.py`, `build-short.sh` — bande-son et construction de la version courte
- `audio/score_mograph.py` — bande-son et bruitages du motion design vectoriel
- `build-mograph.sh` — construction du motion design vectoriel
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
