# Vomalia — motion design de l'app

Vidéo de présentation de l'app mobile Vomalia, format vertical 9:16 (1080×1920), 33,5 s, 30 i/s, avec bande-son.

- `vomalia-motion.mp4` : la vidéo finale (Reels, TikTok, Stories, Shorts).
- `vomalia-motion.html` : la même animation, jouable dans un navigateur (barre de lecture, bouton « Son »). Fichier autonome.

## Déroulé

| Temps | Scène |
|---|---|
| 0–4 s | Une onde sinusoïdale se dessine puis s'enroule en anneau autour du logo. Apparition de « vomalia » et de la signature « Des fréquences pour chaque état. » |
| 4–8 s | Accroche : « Tu te sens… Anxieux·se ? Déconcentré·e ? Démotivé·e ? », avec les puces d'humeur de l'app qui flottent autour, puis « Il y a une fréquence pour ça. » |
| 8–13 s | Le téléphone entre à l'écran. Écran d'accueil : on choisit « Anxieux·se », la carte « Conseillé pour toi · Calme · 15 min » apparaît, puis on la touche. |
| 13–19 s | Lecteur : visualiseur animé (le même que dans l'app), 396 Hz, minuteur. Passage casque → haut-parleur (« Battement binaural » devient « Ton isochrone »). Mise en avant du minuteur et du fondu final. |
| 19–24 s | Défilé des séances : Concentration, Sommeil, Motivation, Méditation, Créativité, Récupération (sphère, fréquence, onde cérébrale), avec la carte correspondante surlignée dans l'app. |
| 24–27 s | Les cinq ondes cérébrales (delta à gamma) tracées à des vitesses croissantes. |
| 27–29 s | Les outils courts : cohérence cardiaque, stimulation bilatérale, gamma 40 Hz, etc. |
| 29–33,5 s | Retour au logo, bouton « Lance ta séance », mention « Bien-être sonore. Ne remplace pas un avis médical. » |

Les écrans du téléphone sont reconstruits à partir du code de l'app : mêmes couleurs, polices (Bricolage Grotesque, Figtree), composants et visualiseur canvas.

La bande-son est synthétisée avec les fréquences de l'app : une cloche par séance à sa fréquence porteuse, la séance Calme (396 Hz, battement binaural 10 Hz qui devient un ton isochrone au passage sur haut-parleur), des pulsations qui accélèrent avec les ondes delta → gamma. Volume normalisé à −16 LUFS.

## Modifier et régénérer

Tout le minutage et les textes sont en haut du script de `src/index.html` : `HOOK` (accroche), `CAPS` (légendes au-dessus du téléphone), `SHOW` (séances du défilé), `TOOLS`, `DUR`. L'animation est une fonction pure du temps `render(t)`, donc chaque image est reproductible.

Aperçu rapide d'un instant précis : ouvrir `vomalia-motion.html?t=14.9`.

Régénérer la vidéo et le HTML (Node + Playwright/Chromium, Python 3 + numpy, ffmpeg) :

```sh
tools/make.sh          # 30 i/s
FPS=60 tools/make.sh   # 60 i/s
```

`tools/render.mjs` exporte aussi les repères audio (`--cues`) lus par `tools/audio.py` : image et son partagent le même minutage.
