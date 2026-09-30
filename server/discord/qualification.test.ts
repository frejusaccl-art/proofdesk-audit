import { describe, expect, it } from "vitest";
import { interestFromAnswers, normalized, qualificationPrompts } from "./qualification.js";

describe("Discord qualification rules", () => {
  it("normalizes whitespace and bounds message length", () => {
    expect(normalized("  SaaS   B2B\n sécurité  ")).toBe("SaaS B2B sécurité");
    expect(normalized("x".repeat(21000))).toHaveLength(20000);
  });

  it("keeps the qualification path explicit and finite", () => {
    expect(qualificationPrompts).toHaveLength(6);
    expect(qualificationPrompts.join(" ")).toContain("activité");
    expect(qualificationPrompts.join(" ")).toContain("budget");
  });

  it("marks urgency as hot and does not invent a level when values are absent", () => {
    expect(interestFromAnswers("échéance cette semaine", "inconnu")).toBe("hot");
    expect(interestFromAnswers(null, null)).toBe("medium");
  });

  it("uses a declared budget as a high-interest signal", () => {
    expect(interestFromAnswers("normale", "budget prévu 10k€")).toBe("high");
  });
});
