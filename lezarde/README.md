# Lézarde

Le suivi des fissures de sécheresse, jusqu'à l'indemnisation.

Les sols argileux gonflent quand ils sont humides et se rétractent quand ils sèchent. Ce mouvement fissure des millions de maisons en France. Pour être indemnisé au titre de la catastrophe naturelle, il faut que la commune soit reconnue par arrêté, déclarer le sinistre dans les 30 jours qui suivent la publication de cet arrêté au Journal officiel, puis convaincre l'expert de l'assurance. Ce qui convainc, c'est l'évolution des fissures dans le temps, documentée et datée.

Lézarde aide le propriétaire à :

- faire des relevés comparables (date, largeur, longueur, photo cadrée de la même façon, avec un repère) ;
- voir l'évolution de chaque fissure (courbe, état : s'ouvre, se referme, stable) ;
- suivre la procédure de sa commune et ne pas rater les délais (24 mois pour la demande communale, 30 jours pour déclarer) ;
- remettre à son assureur un dossier complet : synthèse, chronologie, relevés, photos, liste des pièces et modèle de courrier.

## Modèle économique envisagé

| Offre | Pour qui | Prix indicatif |
|---|---|---|
| Suivi | Propriétaires | Gratuit |
| Dossier assureur | Propriétaires, au moment de déclarer | 49 € une fois |
| Commune | Mairies qui préparent une demande de reconnaissance | dès 290 € par an |

Les prix sont des hypothèses à tester.

## Contenu du dossier

```
index.html        page d'accueil
app.html          l'application de suivi (prototype fonctionnel)
css/style.css     DA commune : vert forêt, crème, vert vif, terre cuite ; titres larges en capitales
css/app.css       styles de l'application et du dossier imprimable
js/site.js        accueil : menu mobile, carrousel des étapes
js/app.js         application : fissures, relevés, courbes, procédure, délais, dossier, sauvegarde
js/db.js          stockage sur l'appareil (IndexedDB, repli en mémoire)
js/exemple.js     maison fictive chargée à la première visite
img/              illustrations vectorielles originales
fonts/            Archivo et Inter Tight (licence SIL OFL 1.1), hébergées avec le site
```

Aucune dépendance, aucune étape de build. Les données restent sur l'appareil de l'utilisateur.

## Lancer en local

```bash
python3 -m http.server 4173
# puis http://localhost:4173/lezarde/
```

L'application s'ouvre sur l'exemple à la première visite. `app.html#nouveau` démarre un suivi vierge, `app.html#exemple` recharge l'exemple (sans jamais écraser des données personnelles sans confirmation).

## Ce qui reste à faire pour un vrai lancement

1. Comptes et synchronisation (aujourd'hui, tout reste sur un seul appareil).
2. Paiement du dossier assureur.
3. Alerte automatique à la publication d'un arrêté, à partir des données publiques des arrêtés de catastrophe naturelle par commune.
4. Espace commune : lien de signalement pour les habitants, carte, export.
5. Relecture juridique des textes (délais, courrier type) et des mentions légales.

## Sources des chiffres affichés

Liées en bas de la page d'accueil : L'info durable, Futura Sciences, ANIL, préfecture de l'Oise, Reassurez-moi. À revérifier avant la mise en ligne publique.
