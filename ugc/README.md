# CinéMood — pub UGC verticale (9:16, 22,6 s)

- `cinemood-ugc-9x16.mp4` : la pub, 1080×1920, 30 i/s, son AAC normalisé à −14 LUFS (TikTok, Reels, Shorts).
- `ad.html` : le montage (accroche, capture, sous-titres, zooms, carte de fin). Ouvre-le dans Chrome avec `--allow-file-access-from-files` pour le prévisualiser.
- `capture.js` : enregistre le vrai parcours sur le site en iPhone 13 (taps + défilements), image par image.
- `drive.js` : rejoue le parcours avec TMDB servi depuis `tmdb-cache/` ; liste les URL manquantes dans `tmdb-requests.txt`.
- `fetch-tmdb-cache.js` + workflow `fetch-tmdb-cache.yml` : GitHub Actions télécharge ces URL avec le secret `TMDB_KEY` (la clé n'est jamais écrite dans le dépôt).
- `prep_frames.py` : convertit la capture en séquence 30 i/s dans `rec/`.
- `sound.py` : bande-son synthétisée (musique ~119 BPM + effets calés sur les taps et les coupes).

Fabrication (le fichier du site reste hors dépôt) :

```sh
export NODE_PATH=$(npm root -g) SITE=/chemin/vers/Cin_Mood_autonome.html
node capture.js /tmp/cap && python3 prep_frames.py /tmp/cap
node render.js build/video.mp4 && python3 sound.py
ffmpeg -i build/video.mp4 -i build/sound.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -shortest cinemood-ugc-9x16.mp4
```

## Déroulé

| Temps | Plan |
|---|---|
| 0 – 2,4 s | Accroche « POV : t'as passé 45 MIN à choisir un film… et t'as rien regardé » sur un mur d'affiches |
| 2,4 – 3,6 s | Arrivée sur le site : « Ce soir, essaie ça » |
| 3,6 – 9,6 s | Les 12 questions au doigt, accélérées : humeur, avec qui, temps, fatigue |
| 9,6 – 11,4 s | « 103 films matchent… il garde les 8 meilleurs » |
| 11,4 – 14,4 s | Pause, puis révélation : Interstellar, 86 % match, le meilleur choix |
| 14,4 – 16,6 s | « Il t'explique POURQUOI ce film » sur l'encart du site |
| 16,6 – 18,6 s | Les autres films classés |
| 18,6 – 22,6 s | Carte de fin : CinéMood, « Ton film. Ton mood. En une minute. », bouton, cinem00d.com |

Tout ce qu'on voit du site est une vraie capture : vraies questions, vrais résultats renvoyés par TMDB.
