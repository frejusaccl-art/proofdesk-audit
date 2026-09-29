export type AuditCalculationInput = {
  volume: number;
  days: number;
  people: number;
  storage: string;
  repeat: string;
  opps: number;
  deal: number | null;
  delayed: string;
  urgency: string;
  role: string;
  library: string;
  proof: string;
  next: string;
};

export type AuditCalculation = {
  current: number;
  low: number;
  high: number;
  score: number;
  tier: string;
  value: number | null;
};

export function calculateAudit(a: AuditCalculationInput): AuditCalculation {
  const current = Math.max(4, a.volume * a.days * a.people * 1.45);
  const low = Math.round(current * 0.35);
  const high = Math.round(current * 0.77);
  let pain = Math.min(30,
    (a.volume >= 6 ? 5 : a.volume >= 3 ? 3 : 1) +
    (a.days >= 5 ? 8 : a.days >= 3 ? 5 : 2) +
    (a.people >= 4 ? 7 : a.people >= 3 ? 5 : 2) +
    (["multiple", "excel"].includes(a.storage) ? 6 : 0) +
    (["often", "always"].includes(a.repeat) ? 4 : 0),
  );
  let impact = a.opps === 0 ? 0 : a.opps <= 2 ? 10 : a.opps <= 5 ? 20 : 30;
  if (a.delayed === "several") impact = Math.min(30, impact + 5);
  else if (a.delayed === "once") impact = Math.min(30, impact + 3);
  const urgencyScores: Record<string, number> = { no: 0, maybe: 7, yes: 14, close: 20 };
  const urgencyScore = urgencyScores[a.urgency] ?? 0;
  const readiness = (a.role ? 5 : 0) + (a.library !== "no" ? 3 : 0) + (a.proof !== "no" ? 3 : 0) + (a.next === "pilot" ? 5 : a.next === "call" || a.next === "demo" ? 3 : 0);
  const score = Math.min(100, pain + impact + urgencyScore + readiness);
  const tier = score < 30 ? "Priorité faible" : score < 60 ? "Opportunité à explorer" : score < 80 ? "Priorité élevée" : "Cas prioritaire";
  return { current, low, high, score, tier, value: a.deal ? a.opps * a.deal : null };
}
