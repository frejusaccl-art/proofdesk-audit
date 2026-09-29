import PDFDocument from "pdfkit";
import { calculateAudit, type AuditCalculation, type AuditCalculationInput } from "../shared/audit.js";

type AuditPdfInput = Partial<AuditCalculationInput> & {
  first?: string;
  last?: string;
  role?: string;
  email?: string;
  company?: string;
  consentVersion?: string;
};

function valueOrUnknown(value: unknown) {
  return value === undefined || value === null || value === "" ? "Non renseigné" : String(value);
}

export function generateAuditPdf(input: { audit?: AuditPdfInput; calculation?: AuditCalculation }) {
  const audit = input.audit ?? {};
  const calculation = input.calculation ?? calculateAudit({
    volume: Number(audit.volume ?? 0),
    days: Number(audit.days ?? 0),
    people: Number(audit.people ?? 0),
    storage: String(audit.storage ?? ""),
    repeat: String(audit.repeat ?? ""),
    opps: Number(audit.opps ?? 0),
    deal: audit.deal == null ? null : Number(audit.deal),
    delayed: String(audit.delayed ?? ""),
    urgency: String(audit.urgency ?? ""),
    role: String(audit.role ?? ""),
    library: String(audit.library ?? ""),
    proof: String(audit.proof ?? ""),
    next: String(audit.next ?? ""),
  });

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 52, info: { Title: "Audit de préparation aux questionnaires sécurité", Author: "ProofDesk" } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const green = "#8bbf3d";
    const ink = "#18201d";
    const muted = "#5f6a64";
    const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

    doc.fillColor(ink).fontSize(10).font("Helvetica-Bold").text("proofdesk", 52, 52);
    doc.fillColor(green).circle(45, 56, 5).fill();
    doc.fillColor(muted).font("Helvetica").fontSize(9).text(date, 400, 54, { width: 145, align: "right" });
    doc.moveDown(4);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(26).text("Audit de préparation", 52, 145);
    doc.fontSize(26).fillColor(green).text("aux questionnaires sécurité");
    doc.moveDown(1);
    doc.fillColor(muted).font("Helvetica").fontSize(11).text(`Document basé sur les informations déclarées par ${valueOrUnknown(`${audit.first ?? ""} ${audit.last ?? ""}`)}.`);
    doc.moveDown(2);

    doc.roundedRect(52, 255, 491, 105, 8).fillAndStroke("#f2f6eb", "#dce8c9");
    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("SYNTHÈSE", 72, 278);
    doc.fillColor(ink).fontSize(23).text(`${calculation.current} h / mois`, 72, 298);
    doc.fillColor(muted).fontSize(10).text("charge estimée déclarée", 72, 329);
    doc.fillColor(ink).fontSize(14).font("Helvetica-Bold").text(calculation.tier, 330, 300, { width: 185, align: "right" });
    doc.fillColor(muted).font("Helvetica").fontSize(10).text("Priorité indicative", 330, 329, { width: 185, align: "right" });

    doc.fillColor(ink).font("Helvetica-Bold").fontSize(16).text("Ce que montre votre déclaration", 52, 405);
    const facts = [
      `• ${valueOrUnknown(audit.volume)} questionnaires ou revues par mois`,
      `• ${valueOrUnknown(audit.days)} jours ouvrés de délai moyen`,
      `• ${valueOrUnknown(audit.people)} personne(s) mobilisée(s) par réponse`,
      `• ${valueOrUnknown(audit.opps)} opportunité(s) commerciale(s) concernée(s) par mois`,
      `• Les réponses et preuves sont conservées : ${valueOrUnknown(audit.storage)}`,
    ];
    doc.font("Helvetica").fontSize(11).fillColor(muted).list(facts, 62, 435, { bulletRadius: 1.5, textIndent: 12, paragraphGap: 8 });

    doc.addPage();
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(18).text("Priorités à explorer");
    doc.moveDown(1);
    const priorities = [
      "Centraliser les réponses récurrentes et leurs sources vérifiables.",
      "Attribuer un propriétaire et une date de validité à chaque preuve importante.",
      "Préparer une validation humaine avant tout envoi à un grand compte.",
    ];
    priorities.forEach((priority, index) => {
      const y = 110 + index * 74;
      doc.roundedRect(52, y, 491, 52, 6).fillAndStroke(index === 0 ? "#f2f6eb" : "#f7f8f6", "#e1e7df");
      doc.fillColor(green).font("Helvetica-Bold").fontSize(12).text(`0${index + 1}`, 70, y + 18);
      doc.fillColor(ink).font("Helvetica").fontSize(11).text(priority, 105, y + 16, { width: 410 });
    });
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(16).text("Méthode de calcul", 52, 365);
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(`${audit.volume ?? 0} questionnaires × ${audit.days ?? 0} jours × ${audit.people ?? 0} personne(s) × 1,45.`, 52, 395);
    doc.text("Les résultats sont des ordres de grandeur. Ils ne constituent pas une certification, un avis juridique ni une garantie de gain.", 52, 425, { width: 480 });
    doc.moveDown(5);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(16).text("Limites importantes");
    doc.fillColor(muted).font("Helvetica").fontSize(10).text("Cet audit repose exclusivement sur les réponses déclarées. ProofDesk ne vérifie pas indépendamment les politiques, preuves, systèmes ou pratiques de votre organisation. Ce document ne constitue ni une certification, ni un avis juridique, ni une garantie de conformité à NIS2, DORA, ISO 27001, SOC 2 ou au RGPD.", { width: 480, lineGap: 4 });
    doc.moveDown(2);
    doc.fillColor(muted).fontSize(9).text("ProofDesk · Audit express · Version 1 · Document généré à la demande");
    doc.end();
  });
}
