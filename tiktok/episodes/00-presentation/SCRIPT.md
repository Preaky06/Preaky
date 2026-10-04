# Épisode 0 — Présentation de la chaîne (57 s)

Format : Draw My Life, 1080×1920, 30 i/s. Ton : autodérision, pas de vulgarité.
Les timecodes viennent de la voix témoin (synthèse) : ils bougent si tu enregistres ta propre voix, et l'animation suit automatiquement.

## Script et storyboard

| Temps | Réplique | Texte (voix off) | Ce qu'on voit |
|---|---|---|---|
| 00.25 → 03.65 | `hook1` | Ma vie est tellement absurde… que j'ai décidé de la dessiner. | Gros plan sur la tête de Maël dessinée au feutre, dézoom, titre « MA VIE EN DESSIN » |
| 03.90 → 05.92 | `hook2` | Moi, c'est Maël. J'ai 20 ans. | Maël fait coucou et parle, flèches « MAËL » / « 20 ANS » |
| 06.12 → 08.47 | `hook3` | Et oui, je me suis dessiné plus beau qu'en vrai. | Étoiles, sourire fier ; cadre « EN VRAI : » avec une version cernée et décoiffée |
| 09.02 → 11.63 | `kid1` | Petit, j'avais un seul talent : dessiner partout. | Maël enfant brandit un feutre géant |
| 11.78 → 15.12 | `kid2` | Sur mes cahiers. Sur la table. Sur le mur du salon. | Cahier → table → dessins d'enfant en couleur sur le mur |
| 15.37 → 17.69 | `kid3` | Ma mère a… moyennement apprécié. | La mère débarque, rouge de colère, fumée ; le gamin transpire ; secousse |
| 18.29 → 21.19 | `school1` | À l'école, les profs disaient que j'étais tout le temps dans la lune. | Tableau « 2+2=? », prof chauve à moustache, bulle « MAËL ?! », gamin rêveur |
| 21.49 → 23.75 | `school2` | Faux. J'étais en train de la dessiner. | Zoom brutal dans le cahier : une lune dessinée |
| 24.35 → 28.04 | `design1` | Alors j'en ai fait mon truc : logos, affiches, identités visuelles… | Logo « P », affiche « 10 LEGEND », palette, « Aa » |
| 28.19 → 31.60 | `design2` | Et aujourd'hui, je suis en formation community manager. | Carte « COMMUNITY MANAGER » + barre de chargement « en formation » |
| 31.90 → 34.24 | `night1` | Mon job : garder les gens scotchés aux réseaux. | Téléphone géant, des gens littéralement scotchés dessus |
| 34.44 → 37.54 | `night2` | Le problème… c'est que le premier scotché, c'est moi. | Réveil 03:47, Maël cerné se fait scotcher, flèche « MOI » |
| 38.14 → 39.97 | `chan1` | Alors tant qu'à scroller, autant créer. | Maël passe de zombie à déterminé, feutre levé |
| 40.17 → 43.06 | `chan2` | Ici, je dessine mes galères, mes pires hontes… | Cases BD « MES GALÈRES » (nuage de pluie) et « MES HONTES » (visage rouge) |
| 43.16 → 44.66 | `chan3` | et vos histoires les plus folles. | Case « VOS HISTOIRES » : un OVNI qui aspire quelqu'un |
| 44.96 → 48.98 | `dm1` | T'as vécu un truc de dingue ? Envoie-le-moi en DM : je le dessine. | Téléphone avec DM, avion en papier qui vole jusqu'à Maël |
| 49.38 → 50.10 | `cta1` | Et abonne-toi. | Bouton « S'ABONNER » cliqué → « ABONNÉ » |
| 50.26 → 52.25 | `cta2` | Sinon je te dessine en patate. | Une patate grognon, flèche « TOI » |
| 53.05 → 55.34 | `end1` | Premier épisode… très vite. | Logo « PREAKY », tampon « ÉPISODE 1 — TRÈS VITE ! », @handle |
| 55.7 → 57.9 | — | — | Dézoom final : tout le tableau dessiné autour du logo |

## Enregistrer ta voix (recommandé)

La voix actuelle est une **voix témoin** de synthèse : elle sert à caler le rythme. Pour un Draw My Life, ta vraie voix fait une grosse différence (ton, humour, crédibilité).

1. Enregistre **une réplique par fichier**, nommé avec l'identifiant de la colonne « Réplique » : `hook1.m4a`, `hook2.m4a`, etc. Tu peux en enregistrer seulement une partie : les répliques manquantes restent en voix de synthèse.
2. Place les fichiers dans `tiktok/episodes/00-presentation/voice/`. Formats acceptés : m4a (dictaphone iPhone), mp3, wav, ogg, flac… Le silence au début et à la fin est coupé automatiquement.
3. Relance `python3 tools/voice.py episodes/00-presentation`, puis `node tools/render.mjs 00-presentation --name presentation-chaine`.

Conseils : enregistre au téléphone dans une pièce avec des rideaux ou des vêtements (moins d'écho), à 15–20 cm de la bouche. Parle vite et souriant, c'est le rythme TikTok.

## Publication

- Couverture : `exports/presentation-chaine_couverture.png`
- `presentation-chaine.mp4` contient voix, bruitages et une musique ukulélé générée (libre de droits).
- `presentation-chaine_sans-musique.mp4` sert si tu veux ajouter un son de la bibliothèque TikTok (règle-le à environ 10–15 % du volume pour que la voix reste devant).
- Les sous-titres sont incrustés et placés hors des zones de l'interface TikTok (haut, bas et colonne de droite).
