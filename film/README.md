# CinéMood — film de marque (16:9, 30 s)

- `cinemood-film-30s-16x9.mp4` : 1920×1080, 60 i/s avec flou de mouvement, son AAC −14 LUFS.
- `film.html` : la composition, une vraie scène 3D en CSS (caméra, tunnel d'affiches, portable et iPhone modélisés),
  calée sur 100 BPM (`b(n)` = n-ième temps). Les écrans affichent les vraies captures du site.
- `capture-desktop.js` : enregistre le parcours sur ordinateur (1440×900 ×1,5, clics souris), TMDB servi depuis `../ugc/tmdb-cache`.
- `sound.py` : bande-son synthétisée (arc en trois actes, clics et taps relus dans les captures).
- `render.js`, `stills.js` : rendu (`BLUR=1` : 120 i/s fusionnées en 60 i/s) et captures fixes.

Fabrication (le fichier du site reste hors dépôt) :

```sh
export NODE_PATH=$(npm root -g) SITE=/chemin/vers/Cin_Mood_autonome.html
node capture-desktop.js /tmp/capd && python3 ../ugc/prep_frames.py /tmp/capd rec-desktop
BLUR=1 node render.js build/video.mp4 && python3 sound.py
ffmpeg -i build/video.mp4 -i build/sound.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -shortest cinemood-film-30s-16x9.mp4
```

## Découpage

| Temps | Plan |
|---|---|
| 0 – 6 s | Tunnel d'affiches en 3D : « Des milliers de films. » « Un seul soir. » « Et toujours la même question. », accélération |
| 6 – 7,8 s | « ON REGARDE QUOI ? » |
| 7,8 – 10,2 s | Ligne rouge, logo CinéMood, « Le bon film pour ton moment. », ouverture des bandes cinéma |
| 10,2 – 13,8 s | Portable 3D, vraie page d'accueil, clic sur « Commencer » : « Douze questions. Une minute. » |
| 13,8 – 17,4 s | L'iPhone rejoint le portable : « Ton humeur. Ton contexte. Ton temps. » |
| 17,4 – 19,8 s | Mur d'affiches filtré : 1 000 000 → 103 → 8 → 1, Interstellar reste |
| 19,8 – 22,8 s | Gros plan iPhone : 86 % compatible, « Et il t'explique pourquoi. » |
| 22,8 – 25,8 s | Résultats sur le portable : « Huit films. Classés. Expliqués. » |
| 25,8 – 30 s | Fin : appareils à gauche ; logo, « Ressens le cinéma qui te ressemble. », bouton, URL |

Les textes reprennent le site (« catalogue mondial », « Ton humeur, ton contexte, ton temps », « Ressens le cinéma qui te ressemble »).
