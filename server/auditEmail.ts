import { type AuditCalculation, type AuditCalculationInput } from "../shared/audit.js";
import { generateAuditPdf } from "./auditPdf.js";

type AuditEmailInput = Partial<AuditCalculationInput> & {
  first?: string;
  last?: string;
  role?: string;
  email?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAuditEmail(input: { audit: AuditEmailInput; calculation?: AuditCalculation }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
  const email = input.audit.email;
  if (!email) throw new Error("An email address is required.");

  const pdf = await generateAuditPdf(input);
  const name = `${input.audit.first ?? ""} ${input.audit.last ?? ""}`.trim() || "Bonjour";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: process.env.RESEND_REPLY_TO || from,
      subject: "Votre rapport d’audit ProofDesk",
      html: `<div style="font-family:Arial,sans-serif;color:#18201d;line-height:1.6;max-width:640px"><h1>Votre rapport ProofDesk</h1><p>Bonjour ${escapeHtml(name)},</p><p>Votre rapport d’audit est joint à cet e-mail. Il reprend uniquement les informations que vous avez déclarées dans l’Audit express.</p><p>Ce document est un outil de qualification. Il ne constitue ni une certification, ni un avis juridique, ni une garantie de conformité.</p><p>Bonne lecture,<br><strong>L’équipe ProofDesk</strong></p></div>`,
      attachments: [{ filename: "proofdesk-audit.pdf", content: pdf.toString("base64") }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email provider rejected the message (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return { sent: true as const };
}
