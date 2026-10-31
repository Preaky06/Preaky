# 🕵️ Opération Taupe

**Le quiz d'infiltration à jouer entre amis, dans la même pièce, chacun sur son téléphone.**

Plusieurs séries de questions de culture générale. À chaque série, un joueur tiré au sort devient **la taupe** : il connaît toutes les réponses et doit faire échouer l'équipe sans se faire démasquer. Les autres répondent, débattent à voix haute, convoquent des réunions d'urgence, recoupent les indices… puis votent.

- 384 questions de culture générale en 12 catégories (+ vos **questions maison**)
- Rôles secrets révélés par **scanner d'empreinte** (maintenir le doigt), dossier identique pour tous
- **Gadgets de la taupe** : brouillage, coupe-chrono, falsification d'indice
- **Indices** débloqués par les bonnes réponses : agent blanchi, message intercepté, périmètre de suspects…
- **Réunions d'urgence**, accusations / défenses publiques, réactions, **tour de parole** optionnel, carnet de suspicion privé
- Vote avec dépouillement animé, scores cachés pendant la série, **distinctions** en fin de partie
- **Écran plateau** pour une TV ou un ordinateur, sans jamais révéler de secret
- Application installable (PWA), écran maintenu allumé, sons et vibrations, reconnexion automatique

---

## 🎮 Règles en bref

1. Le chef d'opération crée un salon. Les autres rejoignent avec le **code à 4 lettres** ou le **QR code**.
2. Chaque série commence par la révélation secrète des rôles : **agent** ou **taupe**.
3. Chaque question est une **mission d'équipe** : elle est réussie si la **réponse majoritaire** est la bonne (égalité = échec). Débattez à voix haute avant de verrouiller !
4. La taupe voit la bonne réponse dans son **dossier**. Tout le monde a un dossier identique : ouvrez-le aussi pour brouiller les pistes.
5. Toutes les 2 missions réussies, l'équipe gagne un **indice** révélé à la réunion suivante.
6. Entre deux questions, un agent peut déclencher une **réunion d'urgence** (1 par partie par défaut).
7. En fin de série : briefing puis **vote**. Le plus voté (s'il dépasse les abstentions) est démasqué. Taupe démasquée → les agents gagnent la série. Innocent démasqué → il est écarté et ne vote plus de la série.

| Action | Points |
| --- | --- |
| Bonne réponse (agent) | +100 |
| Voter contre la taupe | +200 |
| Taupe démasquée (chaque agent) | +100 |
| Faire écarter un innocent | −50 |
| Taupe : mission échouée | +150 |
| Taupe : vote d'un agent sur un innocent | +50 |
| Taupe : non démasquée en fin de série | +300 |
| Taupe : démasquée | −200 |

---

## 🚀 Lancer une partie en 2 minutes (sur ton ordinateur, même Wi-Fi)

Prérequis : [Node.js](https://nodejs.org) 20 ou plus.

```bash
cd operation-taupe
npm install
npm run build
npm start
```

Le terminal affiche deux adresses :

```
Sur cet ordinateur : http://localhost:3000
Sur le Wi-Fi      : http://192.168.1.42:3000
```

Ouvre l'adresse **« Sur le Wi-Fi »** sur chaque téléphone (ou scanne le QR code affiché dans le salon). Tous les téléphones doivent être sur le même Wi-Fi que l'ordinateur. Si ça ne charge pas, autorise Node.js dans le pare-feu de l'ordinateur.

## 🌍 Mettre l'app en ligne (pour jouer n'importe où, sans ordinateur)

Le plus simple, gratuit : **Render**.

1. Crée un compte sur [render.com](https://render.com) avec ton compte GitHub.
2. **New → Blueprint**, choisis ce dépôt : le fichier `render.yaml` à la racine configure tout.
3. Attends la fin du déploiement (≈ 3 min) et ouvre l'adresse `https://operation-taupe-xxxx.onrender.com`.

Limite de l'offre gratuite : le serveur s'endort après 15 min sans visite et met ~50 secondes à se réveiller. Ouvre l'app une minute avant de jouer. Une offre payante (≈ 7 $/mois) supprime ce délai.

Alternative : l'image Docker (`docker build -t taupe . && docker run -p 3000:3000 taupe`) se déploie sur Railway, Fly.io, un VPS, etc.

## 📱 Installer l'app sur le téléphone

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

L'app s'ouvre alors en plein écran avec son icône, comme une app native.

## 📺 Écran plateau

Sur une TV, un ordinateur ou une tablette : accueil → « Écran plateau » → code du salon. L'écran affiche le code, le QR, les questions, les indices et les verdicts en grand, sans aucune information secrète.

## 🏠 Questions maison

Dans le salon, le chef d'opération peut écrire ses propres questions (« Qui a déjà raté son train pour Nice ? »). Elles sont mélangées aux autres, sauvegardées sur son téléphone et exportables en JSON.

Pour enrichir la banque principale : `server/questions/bank.ts`, une ligne par question :

```ts
[2, 'Texte de la question ?', 'Bonne réponse', 'Mauvaise 1', 'Mauvaise 2', 'Mauvaise 3'],
// difficulté : 1 = facile, 2 = moyen, 3 = difficile
```

---

## 🛠️ Développement

```bash
npm run dev        # serveur (port 3000) + interface avec rechargement à chaud (port 5173)
npm test           # moteur de jeu + serveur temps réel (vitest)
npm run typecheck  # vérification TypeScript
node scripts/e2e.mjs http://localhost:3000 /tmp/captures   # partie complète sur 4 téléphones simulés (Playwright)
```

Architecture :

- `server/game.ts` — moteur de jeu (machine à états : salon → rôles → questions → réunions → votes → fin de série), entièrement côté serveur : les clients ne reçoivent que ce qu'ils ont le droit de voir.
- `server/rooms.ts` — salons, sessions, reconnexion (Socket.IO).
- `server/intel.ts` — génération des indices (vrais et falsifiés).
- `server/questions/` — banque de questions et tirage (sans doublon dans un même salon).
- `src/` — interface React (PWA) : `screens/` un écran par phase, `components/`, `styles/global.css`.
- `shared/` — types et constantes communs.

Limites connues : les parties vivent en mémoire (un redémarrage du serveur les efface) ; la vibration n'existe pas sur iPhone ; le maintien de l'écran allumé demande iOS 16.4+ ou un Android récent.
