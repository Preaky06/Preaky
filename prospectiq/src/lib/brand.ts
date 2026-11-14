// Identité Pro Spectre partagée client/serveur : une couleur du spectre par critère du score.
// Les couleurs ne portent jamais seules l'information : chaque barre est accompagnée de son libellé et de sa valeur.
export const CRITERIA_COLORS: Record<string, string> = {
  need: '#8b5cf6',
  relevance: '#6366f1',
  digital: '#06b6d4',
  signals: '#10b981',
  data: '#f59e0b',
};

export const criterionColor = (id: string) => CRITERIA_COLORS[id] || '#6366f1';
