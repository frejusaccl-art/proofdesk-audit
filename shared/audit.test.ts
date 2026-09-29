import { describe, expect, it } from "vitest";
import { calculateAudit } from "./audit";

const base = {
  volume: 6, days: 3, people: 3, storage: "multiple", repeat: "often",
  opps: 3, deal: 45000, delayed: "several", urgency: "yes", role: "CTO",
  library: "partial", proof: "partial", next: "call",
};

describe("calculateAudit", () => {
  it("calcule une charge mensuelle et une valeur commerciale prudentes", () => {
    const result = calculateAudit(base);
    expect(result.current).toBeCloseTo(78.3);
    expect(result.low).toBe(27);
    expect(result.high).toBe(60);
    expect(result.value).toBe(135000);
    expect(result.tier).toBe("Priorité élevée");
  });

  it("ne crée pas de valeur commerciale si l’utilisateur ne chiffre pas l’opportunité", () => {
    const result = calculateAudit({ ...base, deal: null, opps: 0, urgency: "no", delayed: "never", role: "", library: "no", proof: "no", next: "later" });
    expect(result.value).toBeNull();
    expect(result.score).toBeLessThan(30);
    expect(result.tier).toBe("Priorité faible");
  });
});
