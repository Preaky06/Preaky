# Preaky

## Preaky Casse-têtes

`app/` contient une appli mobile de casse-têtes (application web installable, qui marche hors connexion), pensée pour être utilisable par tout le monde : enfants, adultes, seniors.

### Les 7 casse-têtes

| Casse-tête | Niveaux | Ce qui est garanti |
|---|---|---|
| Sudoku | 4×4, 6×6, 9×9 (5 niveaux) | Solution unique, vérifiée à la génération |
| Logimage (nonogramme) | 5×5, 8×8, 10×10 | Se résout par pure logique, sans deviner |
| Mots mêlés | 8×8 à 12×12, 12 thèmes | Tous les mots sont placés, de 2 à 8 directions |
| Code secret | 3 à 5 chiffres | Bloc-notes pour rayer/marquer les chiffres |
| Taquin | 3×3 à 5×5 | Toujours soluble (mélange par coups légaux) |
| Tours de Hanoï | 3 à 7 disques | L'indice donne le coup optimal |
| Interrupteurs | 3×3 à 6×6 | Une solution connue, l'indice est toujours exact |

Pour chacun : annuler, indice, règles accessibles à tout moment, sauvegarde automatique à chaque coup (on reprend plus tard), statistiques et record par niveau (un record ne compte que sans indice).

Un **casse-tête du jour** change chaque jour : la même grille pour tout le monde.

### Principes d'interface

- Sobre : fond neutre, cartes à bord fin, un seul accent de couleur, pas de publicité ni de récompenses à collectionner.
- Lisible : police Atkinson Hyperlegible (conçue pour les personnes malvoyantes), texte réglable sur 3 tailles, thème clair ou sombre.
- Simple : un écran d'accueil, une fiche par casse-tête, un écran de jeu, des réglages. Le bouton retour du téléphone fonctionne partout.
- Aides réglables : signaler les erreurs, afficher ou cacher le chronomètre.
- Accessible : tout se joue au toucher simple (le glisser est toujours optionnel), au clavier, et avec un lecteur d'écran.

### Lancer en local

```bash
cd app
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

### Publier

N'importe quel hébergement statique en HTTPS suffit (par exemple GitHub Pages, servi sous `/app/`). Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une appli. À chaque mise à jour, incrémenter `VERSION` dans `app/sw.js`.

### Structure

```
app/
  index.html, manifest.webmanifest, sw.js, css/app.css, icons/
  js/main.js        navigation (ancres d'URL) et réglages
  js/screens.js     accueil, fiche d'un casse-tête, réglages
  js/play.js        écran de jeu commun : chrono, outils, sauvegarde, victoire
  js/store.js       stockage local : statistiques, parties en cours, casse-tête du jour
  js/puzzles/*.js   un fichier par casse-tête : create(niveau, hasard) + start(ctx)
```

### À noter sur le portfolio

Le fichier `index.html` à la racine contient du code React/TSX et CSS collé dans un fichier HTML. Il ne s'affiche pas tel quel dans un navigateur : il faut le replacer dans un projet Vite/React.
