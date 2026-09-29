type VercelResponse = { status(code: number): VercelResponse; json(payload: unknown): void };

export default function handler(_req: unknown, res: VercelResponse) {
  res.status(200).json({ ok: true, service: "proofdesk-api" });
}
