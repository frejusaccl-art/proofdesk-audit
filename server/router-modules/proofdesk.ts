import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auditEvents, auditLeads, evidence, ensureWorkspace, getWorkspaceSummary, getDb, questionnaires } from "../db.js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";

const questionnaireStatus = z.enum(["draft", "in_review", "approved", "shared"]);
const evidenceStatus = z.enum(["valid", "expiring", "expired"]);

async function workspaceFor(ctx: { user: { id: number; name?: string | null } }) {
  return ensureWorkspace(ctx.user.id, ctx.user.name);
}

export const proofdeskRouter = router({
  workspace: router({
    summary: protectedProcedure.query(({ ctx }) => getWorkspaceSummary(ctx.user.id, ctx.user.name)),
  }),
  questionnaires: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
      const { organization } = await workspaceFor(ctx);
      return db.select().from(questionnaires).where(eq(questionnaires.organizationId, organization.id)).orderBy(desc(questionnaires.updatedAt));
    }),
    create: protectedProcedure.input(z.object({ title: z.string().min(2), company: z.string().min(2), dueAt: z.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
      const { organization } = await workspaceFor(ctx);
      const inserted = await db.insert(questionnaires).values({ organizationId: organization.id, title: input.title, company: input.company, dueAt: input.dueAt ?? null, createdBy: ctx.user.id, status: "draft" });
      return { id: Number(inserted[0].insertId) };
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: questionnaireStatus })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
      const { organization } = await workspaceFor(ctx);
      await db.update(questionnaires).set({ status: input.status }).where(eq(questionnaires.id, input.id));
      const result = await db.select().from(questionnaires).where(eq(questionnaires.organizationId, organization.id)).orderBy(desc(questionnaires.updatedAt));
      return result;
    }),
  }),
  evidence: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
      const { organization } = await workspaceFor(ctx);
      return db.select().from(evidence).where(eq(evidence.organizationId, organization.id)).orderBy(desc(evidence.updatedAt));
    }),
    create: protectedProcedure.input(z.object({ title: z.string().min(2), kind: z.string().min(2), ownerName: z.string().optional(), expiresAt: z.date().nullable().optional(), status: evidenceStatus.default("valid") })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
      const { organization } = await workspaceFor(ctx);
      const inserted = await db.insert(evidence).values({ organizationId: organization.id, title: input.title, kind: input.kind, ownerName: input.ownerName || null, expiresAt: input.expiresAt ?? null, status: input.status });
      return { id: Number(inserted[0].insertId) };
    }),
  }),
  auditLeads: router({
    create: publicProcedure.input(z.object({ email: z.string().email(), firstName: z.string().optional(), lastName: z.string().optional(), role: z.string().optional(), score: z.number().int().min(0).max(100), currentHours: z.number().int().min(0), opportunityValue: z.number().int().nullable().optional(), nextStep: z.string().optional(), answers: z.record(z.string(), z.unknown()), consentAt: z.string().datetime(), consentVersion: z.string().min(1).max(40), consentPurpose: z.string().min(1).max(255), source: z.string().max(80).optional(), utmSource: z.string().max(120).optional(), utmMedium: z.string().max(120).optional(), utmCampaign: z.string().max(120).optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { id: null, persisted: false as const };
      const inserted = await db.insert(auditLeads).values({ email: input.email, firstName: input.firstName || null, lastName: input.lastName || null, role: input.role || null, score: input.score, currentHours: input.currentHours, opportunityValue: input.opportunityValue ?? null, nextStep: input.nextStep || null, answers: JSON.stringify(input.answers), consentAt: new Date(input.consentAt), consentVersion: input.consentVersion, consentPurpose: input.consentPurpose, source: input.source || null, utmSource: input.utmSource || null, utmMedium: input.utmMedium || null, utmCampaign: input.utmCampaign || null });
      return { id: Number(inserted[0].insertId), persisted: true as const };
    }),
  }),
  auditEvents: router({
    track: publicProcedure.input(z.object({ eventName: z.string().min(2).max(80), sessionId: z.string().max(120).optional(), path: z.string().max(255).optional(), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { persisted: false as const };
      await db.insert(auditEvents).values({ eventName: input.eventName, sessionId: input.sessionId || null, path: input.path || null, metadata: input.metadata ? JSON.stringify(input.metadata) : null });
      return { persisted: true as const };
    }),
  }),
});
