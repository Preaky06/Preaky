# Preaky
## Ladalle

Site de bons plans alimentaires pour étudiants, dans `ladalle/` (statique, sans build ni dépendance).

- Ouvrir `ladalle/index.html` dans un navigateur, ou servir le dossier (`python3 -m http.server -d ladalle`).
- `data.js` : ingrédients (prix estimés), plats, magasins, bons plans. `app.js` : filtres, générateur de semaine, placard, liste de courses. `styles.css` : direction artistique (variables en tête de fichier).
- `LIGNE-EDITORIALE.md` : ligne éditoriale.
- Photos : `node tools/fetch-images.mjs` (depuis `ladalle/`, Node 18+) télécharge une photo sous licence libre par plat depuis Wikimedia Commons dans `img/` et régénère `images.js` avec les crédits. Sans photo, le plat garde son pictogramme.
- Abonnement : formule gratuite (3 fiches et 1 semaine par mois) et Premium à 4,99 €. Renseigner `PAY_LINK` en tête de `app.js` avec un lien de paiement ; vide, le bouton active un mode démo. Le quota est compté dans le navigateur : une vraie protection demande des comptes et un serveur.
