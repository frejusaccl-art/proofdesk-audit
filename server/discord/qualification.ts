export const qualificationPrompts = [
  "Pour commencer, quelle activité ou quel type d’entreprise représentez-vous ?",
  "Dans quelle situation êtes-vous aujourd’hui face aux questionnaires sécurité ?",
  "Quel est le principal blocage que vous voulez résoudre ?",
  "Quel résultat concret aimeriez-vous obtenir dans les prochaines semaines ?",
  "Quelle est l’urgence : faible, normale, élevée, ou une échéance précise ?",
  "Avez-vous déjà prévu un budget ou une enveloppe pour ce sujet ? Si ce n’est pas défini, répondez simplement « inconnu ». ",
] as const;

export function normalized(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 20000);
}

export function interestFromAnswers(urgency?: string | null, budget?: string | null) {
  const text = `${urgency ?? ""} ${budget ?? ""}`.toLowerCase();
  if (/(urgent|élev|echeance|échéance|ce mois|cette semaine|signer)/i.test(text)) return "hot" as const;
  if (/(budget|oui|prévu|prevu|k€|€|euros)/i.test(text)) return "high" as const;
  return "medium" as const;
}
