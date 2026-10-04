# Preaky — vidéos TikTok « Draw My Life »

Un petit studio d'animation en code : tu écris un script, tu places les dessins sur une timeline calée sur la voix, et le moteur génère une vidéo verticale 1080×1920 prête pour TikTok. Le rendu reproduit le style Draw My Life : main au feutre, coloriage au marqueur, traits qui « vibrent », sous-titres mot à mot, caméra qui se déplace sur un grand tableau blanc.

## Ce qui est livré

| Fichier | Contenu |
|---|---|
| `exports/presentation-chaine.mp4` | Vidéo de présentation de la chaîne (58 s) : voix, bruitages, musique |
| `exports/presentation-chaine_sans-musique.mp4` | Même vidéo sans musique, pour ajouter un son TikTok |
| `exports/presentation-chaine_couverture.png` | Image de couverture |
| `episodes/00-presentation/SCRIPT.md` | Script, storyboard avec les timecodes, guide pour enregistrer ta voix |

## Installation (une seule fois)

Prérequis : Node 18+, Python 3.10+ et ffmpeg.

```bash
cd tiktok
npm install                     # Playwright (navigateur Chromium pour le rendu)
npx playwright install chromium # si Chromium n'est pas déjà installé
pip install -r requirements.txt # voix de synthèse + audio
```

## Fabriquer une vidéo

```bash
python3 tools/voice.py episodes/00-presentation        # 1. voix + timing des mots
node tools/render.mjs 00-presentation --sheet 1        # 2. planche de contrôle (build/…/sheet.png)
node tools/render.mjs 00-presentation --name presentation-chaine   # 3. vidéo finale (~3 min)
node tools/render.mjs 00-presentation --cover 8.8 --name presentation-chaine  # couverture
```

Autres options : `--stills 2.5,10` sort des images à des instants précis, `--workers 4` règle le rendu en parallèle, `--boil 0` désactive la vibration des traits.

## Créer un nouvel épisode

1. Copie `episodes/00-presentation` vers `episodes/01-mon-histoire`.
2. Dans `script.json`, écris les répliques. Chaque réplique a un `id`, le `text` affiché en sous-titre, un `tts` facultatif (orthographe phonétique pour la synthèse, par ex. « kommiouniti manadjeur ») et une `pause` après.
3. Dans `scenes.js`, place les dessins. Les instants se calent sur la voix :
   - `E.L('kid2').start` : début d'une réplique ;
   - `E.Wd('kid2', 'table')` : moment où le mot « table » est prononcé.
4. Lance les trois commandes ci-dessus avec le nouveau nom d'épisode.

### Les briques disponibles

```js
E.draw(scene, parts, { at, dur, x, y, s, r, flip, color })  // la main dessine puis colorie
E.pop(scene, parts, { at, x, y, s, r })                      // apparition avec rebond
E.mael({ armR: 'wave', eyes: 'happy', mouth: 'grin' })       // Maël adulte
E.maelKid({...}) / E.person({ hair, top, topColor, glasses, mustache… })
E.expr(perso, 'scared', t0, t1)   // change d'expression (définie dans faces: {...})
E.talk(perso, t0, t1)             // bouche synchronisée sur la voix
E.blink(perso, t0, t1)            // clignements d'yeux
E.swing(perso.parts.armR, t0, t1) // bras qui fait coucou
E.camTo(t, x, y, zoom, durée)     // mouvement de caméra (whoosh automatique)
E.punch(t) / E.shake(t)           // zoom-choc / secousse sur une chute
E.sfx('boing', t)                 // bruitage (pop, ding, shine, boom, tape, tick, click, boing, stamp…)
```

Poses des bras : `idle, wave, hips, front, point, up, shrug, draw, face, down, chin`.
Yeux : `normal, happy, closed, wide, tired`. Bouches : `smile, grin, o, scream, flat, wavy, frown, smirk, tongue`.
Accessoires (`E.props`) : feutre géant, cahier, table, dessins muraux, tableau noir, pupitre, lune, logo, affiche, palette, téléphone, scotch, réveil, case de BD, nuage de pluie, OVNI, avion en papier, bouton S'abonner, curseur, patate, tampon.

## Comment ça marche

- `engine/` : moteur SVG. Chaque image se calcule à partir du seul temps `t`, ce qui permet de rendre en parallèle et d'obtenir le même résultat à chaque rendu.
- `tools/voice.py` : voix de synthèse française (Piper « tom », via sherpa-onnx, modèle téléchargé automatiquement dans `.cache/`) ou tes enregistrements, puis calcul du timing de chaque mot.
- `tools/render.mjs` : Chromium headless capture chaque image, ffmpeg encode en H.264 (CRF 17) et AAC.
- `tools/audio.py` : bruitages et musique synthétisés (aucun fichier externe, donc aucun problème de droits), ducking de la musique sous la voix, normalisation à −14 LUFS.

Polices : Permanent Marker, Gochi Hand, Titan One et Fredoka (Google Fonts, licences OFL/Apache, incluses dans `engine/fonts/`).
