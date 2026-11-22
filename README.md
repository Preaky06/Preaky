# Preaky

## Preaky Mind — l'appli d'entraînement cérébral

`app/` contient **Preaky Mind**, une appli mobile (PWA installable, hors ligne) de mini-jeux de 5 minutes pour la concentration, la mémoire et la logique, pensée pour tous les âges.

### Ce qui la distingue des applis existantes

| Problème courant (Lumosity, Peak, Elevate, NeuroNation…) | Réponse de Preaky Mind |
|---|---|
| Promesses floues (« boostez votre intelligence ») | Écran « Ce que dit la science » : on progresse surtout sur les jeux pratiqués. Pas de « âge cérébral ». |
| Le jeu reste dans l'appli | Chaque jeu enseigne une **technique transférable** (regroupement, balayage, palais mental…) et chaque séance finit par un **défi « vraie vie »**. |
| Chrono stressant, exclut les seniors | **Mode zen** : sans chrono, la difficulté s'adapte à la précision. Texte réglable sur 3 tailles, gros boutons, aucun geste complexe. |
| Comparaison aux autres, culpabilisation des séries | On se compare **à soi-même**. Objectif doux de 4 jours/semaine, pas de série qui « casse ». |
| Expérience solitaire | **Mode À deux** : même jeu, mêmes défis (même graine aléatoire), on se passe le téléphone. |
| Compte, pub, abonnement | Aucun compte, aucune pub, aucun suivi. Données sur l'appareil. |

### Les 6 jeux (2 par domaine)

| Domaine | Jeu | Tâche d'origine | Technique enseignée |
|---|---|---|---|
| Concentration | Flèches | Flanker d'Eriksen | Fixer le centre |
| Concentration | L'intrus | Recherche visuelle | Balayer ligne par ligne |
| Mémoire | Séquence | Blocs de Corsi | Dessiner la forme |
| Mémoire | Chiffres | Empan de chiffres | Faire des paquets |
| Logique | Suites | Raisonnement inductif | Une règle à la fois |
| Logique | Balance | Déduction par substitution | Tout convertir dans la même unité |

Toutes les différences visuelles reposent sur la forme ou l'orientation, jamais sur la couleur seule : les jeux restent jouables par les personnes daltoniennes.

### Lancer en local

Les modules ES exigent un serveur HTTP (pas `file://`) :

```bash
cd app
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 (sur téléphone : http://<ip-de-l-ordi>:8000)
```

### Publier

N'importe quel hébergement statique en HTTPS suffit. Avec GitHub Pages activé sur la branche principale, l'appli est servie sous `/app/`. Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une appli.

À chaque mise à jour, incrémenter `VERSION` dans `app/sw.js` pour que les téléphones récupèrent les nouveaux fichiers.

### Structure

```
app/
  index.html            point d'entrée
  manifest.webmanifest  installation PWA
  sw.js                 cache hors ligne
  css/app.css           design (tokens CMJN, clair/sombre, tailles de texte)
  js/main.js            démarrage + onglets
  js/screens.js         Aujourd'hui, Jeux, Progrès, Réglages, premier lancement
  js/player.js          intro → décompte → partie → résultat ; séance, jeu libre, duel
  js/games/*.js         un fichier par jeu (même interface : play(ctx) → score + niveau suivant)
  js/store.js           sauvegarde locale
```

### Direction visuelle

Reprise de l'identité du portfolio : fond blanc, noir profond, polices Titan One et Fredoka, formes très arrondies. La palette est celle des quatre encres d'imprimerie (cyan, magenta, jaune, noir), un clin d'œil au graphisme : cyan = concentration, magenta = mémoire, jaune = logique, noir = actions. La mascotte est une goutte d'encre.

### À noter sur le portfolio

Le fichier `index.html` à la racine contient du code React/TSX et CSS collé dans un fichier HTML. Il ne s'affiche pas tel quel dans un navigateur : il faut le replacer dans un projet Vite/React.
