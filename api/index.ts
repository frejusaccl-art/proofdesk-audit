import { appRouter } from "../server/routers";

type VercelResponse = { status(code: number): VercelResponse; json(payload: unknown): void };

export default function handler(_req: unknown, res: VercelResponse) {
  res.status(200).json({ ok: true, procedures: Object.keys(appRouter._def.procedures) });
}
