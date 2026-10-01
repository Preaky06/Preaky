/* CinéMood — textes légaux (site gratuit, sans compte, sans collecte).
   Les mentions entre crochets doivent être complétées par l'éditeur du site. */
window.MoodflixLegal = (function () {
  'use strict';

  var TODO = function (t) { return '[à compléter : ' + t + ']'; };
  var EDITEUR = 'Preaky';
  var CONTACT = 'maelgillet18@gmail.com';
  var MAJ = 'septembre 2026';

  var MENTIONS = {
    id: 'mentions', label: 'Mentions légales',
    intro: 'Informations prévues par la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l\u2019économie numérique.',
    blocks: [
      {t: 'Éditeur du site', p: [
        'CinéMood — édité par ' + EDITEUR + '.',
        'Site édité à titre non professionnel, sans activité commerciale : aucun service payant, aucune publicité, aucune inscription.',
        'Contact : ' + CONTACT + '.'
      ]},
      {t: 'Hébergement', p: [
        'Le site est hébergé par Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis — cloudflare.com.',
        'Nom de domaine cinem00d.com enregistré auprès de IONOS SARL, 7 place de la Gare, 57200 Sarreguemines.'
      ]},
      {t: 'Propriété intellectuelle', p: [
        'L\u2019interface, les textes et le moteur de recommandation sont la propriété de l\u2019éditeur.',
        'Les titres, affiches, images et métadonnées des films restent la propriété de leurs ayants droit respectifs. Ils sont affichés à titre d\u2019information.'
      ]},
      {t: 'Source des données', p: [
        'Ce produit utilise l\u2019API TMDB mais n\u2019est ni approuvé ni certifié par TMDB. Les données et visuels des films proviennent de The Movie Database (themoviedb.org).',
        'CinéMood ne diffuse aucun film et n\u2019héberge aucun contenu vidéo. Les liens « Où le voir » renvoient vers des services tiers, dont la disponibilité n\u2019est pas garantie.',
        'Les bandes-annonces sont lues depuis YouTube, en mode sans cookie, et uniquement lorsque vous cliquez sur Lecture.'
      ]},
      {t: 'Responsabilité', p: [
        'Le service est fourni en l\u2019état, gratuitement, sans garantie de disponibilité. Il dépend d\u2019une base de données tierce dont l\u2019interruption peut rendre les recommandations temporairement indisponibles.',
        'Les recommandations sont des suggestions : elles n\u2019engagent pas la responsabilité de l\u2019éditeur.'
      ]},
      {t: 'Signalement', p: [
        'Tout contenu que vous jugeriez inexact ou litigieux peut être signalé à ' + CONTACT + '.'
      ]}
    ]
  };

  var PRIVACY = {
    id: 'privacy', label: 'Confidentialité',
    intro: 'La version courte : CinéMood ne collecte rien. Pas de compte, pas de formulaire, pas de cookie publicitaire, aucune donnée envoyée à l\u2019éditeur. Version du ' + MAJ + '.',
    blocks: [
      {t: 'Aucune donnée personnelle collectée', p: [
        'Le site ne demande ni inscription, ni adresse e-mail, ni aucune information vous concernant.',
        'Vos réponses au questionnaire servent uniquement au calcul de la recommandation affichée. Elles ne sont ni enregistrées, ni transmises, et disparaissent dès que vous quittez la page.',
        'Aucun historique, aucune liste, aucun profil n\u2019est conservé.'
      ]},
      {t: 'Aucun cookie, aucun traceur', p: [
        'CinéMood n\u2019utilise ni cookie publicitaire, ni traceur d\u2019audience, ni outil de mesure.',
        'Aucun consentement n\u2019a donc à vous être demandé.'
      ]},
      {t: 'Services tiers sollicités', p: [
        'The Movie Database (TMDB) fournit les fiches, affiches et bandes-annonces. Vos recherches et les films affichés transitent par ce service, sans identifiant vous concernant.',
        'YouTube, en mode sans cookie, diffuse les bandes-annonces — uniquement après un clic de votre part sur Lecture.',
        'Cloudflare héberge le site et traite techniquement les requêtes, comme tout hébergeur.',
        'Ces services appliquent leurs propres politiques de confidentialité.'
      ]},
      {t: 'Vos droits', p: [
        'Aucune donnée vous concernant n\u2019étant conservée, il n\u2019y a rien à consulter, rectifier ou supprimer.',
        'Pour toute question : ' + CONTACT + '.',
        'Vous pouvez, si vous le jugez utile, saisir la CNIL : 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — cnil.fr.'
      ]}
    ]
  };

  return {PAGES: [MENTIONS, PRIVACY], MAJ: MAJ};
})();
