# CinéMood — motion design 15 s

- `cinemood-motion-15s.mp4` : rendu final 1920×1080, 60 i/s, H.264, son AAC stéréo normalisé à −14 LUFS.
- `sound.py` : design sonore entièrement synthétisé (aucun sample externe), calé sur la timeline ; produit `sound.wav`.
- `fetch-posters.js` : télécharge les affiches TMDB dans `posters/` (lancé par GitHub Actions avec le secret `TMDB_KEY`).
- `index.html` : la composition. Ouvre-la dans un navigateur pour la prévisualiser (lecture en boucle, curseur de timeline).
- `render.js` : rendu image par image (240 i/s, 3 échantillons fusionnés par image en 60 i/s pour le flou de mouvement).
- `stills.js` : captures à des instants précis, ex. `node stills.js ./out 2.5 9.8`.

Rendu complet :

```sh
NODE_PATH=$(npm root -g) node render.js video.mp4   # image (Playwright + ffmpeg)
python3 sound.py                                     # son (numpy + scipy)
ffmpeg -i video.mp4 -i sound.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -shortest cinemood-motion-15s.mp4
```

## Découpage

| Temps | Plan |
|---|---|
| 0,0 – 1,5 s | Ligne rouge qui s'étire puis devient le tiret « 12 QUESTIONS » |
| 1,5 – 4,2 s | Hero « Ressens le cinéma qui te ressemble », néon, mur d'affiches, clic sur « Commencer » |
| 3,8 – 4,7 s | Transition : cercle rouge depuis le bouton |
| 4,2 – 7,6 s | Quiz : 8 humeurs, clic « Avoir peur », défilement des 12 questions, choix accumulés |
| 7,6 – 10,9 s | Filtres → 1 000 000 films → 5, cartes classées, « Le meilleur choix », zoom dans l'affiche |
| 10,9 – 12,8 s | Trois temps : 12 questions. / 1 minute. / Le bon film. |
| 12,8 – 15,0 s | Logo CinéMood, signature, CTA « Trouver mon film », cinem00d.com |

Les textes viennent du site (questions, réponses, accroches). Les affiches viennent de TMDB ; si un fichier manque dans `posters/`, une illustration abstraite le remplace.
