type VercelResponse = { status(code: number): VercelResponse; json(payload: unknown): void };

export default async function handler(_req: unknown, res: VercelResponse) {
  try {
    const { appRouter } = await import("../server/routers");
    res.status(200).json({ ok: true, procedures: Object.keys(appRouter._def.procedures) });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({ ok: false, error: err.message, name: err.name });
  }
}
