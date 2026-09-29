import { describe, expect, it } from "vitest";
import { generateAuditPdf } from "./auditPdf.js";

describe("audit PDF", () => {
  it("generates a readable A4 PDF from declared inputs", async () => {
    const pdf = await generateAuditPdf({
      audit: {
        volume: 4,
        days: 3,
        people: 2,
        storage: "drive",
        repeat: "often",
        opps: 2,
        deal: null,
        delayed: "once",
        urgency: "yes",
        role: "CTO",
        library: "partial",
        proof: "partial",
        next: "report",
      },
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2_000);
  });
});
