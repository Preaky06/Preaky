# CinéMood — « La course » (9:16, 26 s)

Mise en scène du gain de temps : deux téléphones côte à côte depuis vendredi 21:00.

- `cinemood-la-course-9x16.mp4` : la vidéo, 1080×1920, 30 i/s, son AAC normalisé à −14 LUFS.
- `scene.html` : la composition. À gauche, un catalogue de streaming générique (sans marque) et la conversation du couple ; à droite, la vraie capture CinéMood (`../ugc/rec/`).
- `assets.js` : liste des affiches TMDB en cache (`../ugc/tmdb-cache/`) utilisées par le faux catalogue.
- `sound.py` : bande-son synthétisée, repères lus dans `scene.html`.
- `render.js`, `stills.js` : rendu et captures fixes (comme dans `../ugc/`).

## Ce qui est réel, ce qui est mis en scène

- **Réel** : tout l'écran de droite (vraies questions, vrais résultats TMDB, Interstellar à 86 %).
- **Chrono de droite** : la capture est jouée ×1,6 ; le chrono affiche le temps de capture ×3,2, soit 59 s pour un humain au lieu des 18 s du script. Cohérent avec la promesse du site : « Une minute, pas plus ».
- **Mis en scène** : le catalogue de gauche, la conversation et les 47 min. C'est une scène, pas une statistique.

## Fabrication

```sh
export NODE_PATH=$(npm root -g)
node render.js build/video.mp4 && python3 sound.py
ffmpeg -i build/video.mp4 -i build/sound.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -shortest cinemood-la-course-9x16.mp4
```
