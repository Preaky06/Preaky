import apprendre from "./apprendre.js";
import histoire from "./histoire.js";
import poeme from "./poeme.js";
import discours from "./discours.js";
import business from "./business.js";
import contenu from "./contenu.js";
import travail from "./travail.js";
import ecrit from "./ecrit.js";
import decision from "./decision.js";
import planifier from "./planifier.js";
import code from "./code.js";
import image from "./image.js";
import autre from "./autre.js";

// Ordre d'affichage. « Autre chose » reste en dernier : c'est le type par défaut.
export const TYPES = [apprendre, histoire, poeme, discours, business, contenu, travail, ecrit, decision, planifier, code, image, autre];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));
export const DEFAULT_TYPE = "autre";

// Questions à afficher compte tenu des réponses déjà données
export function visibleQuestions(type, answers) {
  return type.questions.filter((q) => !q.when || q.when(answers));
}
