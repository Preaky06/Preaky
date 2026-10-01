# CinéMood — motion design 15 s

- `cinemood-motion-15s.mp4` : rendu final 1920×1080, 60 i/s, H.264, sans son.
- `index.html` : la composition. Ouvre-la dans un navigateur pour la prévisualiser (lecture en boucle, curseur de timeline).
- `render.js` : rendu image par image (120 i/s fusionnés en 60 i/s pour le flou de mouvement).
- `stills.js` : captures à des instants précis, ex. `node stills.js ./out 2.5 9.8`.

Rendu : `NODE_PATH=$(npm root -g) node render.js` (Playwright + ffmpeg requis).

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

Les textes viennent du site (questions, réponses, accroches). Les affiches sont des illustrations abstraites : aucun visuel de film n'est utilisé.
