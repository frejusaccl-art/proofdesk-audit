import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "../server/_core/context.js";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { appRouter } from "../server/routers.js";
import { generateAuditPdf } from "../server/auditPdf.js";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);

app.post("/api/audit/pdf", async (req: Request, res: Response) => {
  try {
    const pdf = await generateAuditPdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=proofdesk-audit.pdf");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(pdf);
  } catch (error) {
    console.error("[Audit PDF] Generation failed", error);
    res.status(400).json({ error: "Impossible de générer le PDF d’audit." });
  }
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
