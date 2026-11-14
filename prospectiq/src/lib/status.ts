// Statuts du CRM (partagé client/serveur).
export const STATUSES = [
  { id: 'nouveau', label: 'Nouveau prospect' },
  { id: 'a_contacter', label: 'À contacter' },
  { id: 'contacte', label: 'Contacté' },
  { id: 'reponse', label: 'Réponse reçue' },
  { id: 'rdv', label: 'Rendez-vous obtenu' },
  { id: 'client', label: 'Client' },
  { id: 'non_interesse', label: 'Non intéressé' },
] as const;
export type StatusId = (typeof STATUSES)[number]['id'];
export const STATUS_IDS = STATUSES.map((s) => s.id) as [StatusId, ...StatusId[]];
export const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
export const statusLabel = (id: string) => STATUS_LABELS[id] || id;
