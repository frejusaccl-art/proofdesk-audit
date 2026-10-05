import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, getQualifyProspect, getQualifySummary, getRecentConversionRequests, qualifyMessages, qualifyNotes, qualifyProspects } from "../db.js";
import { protectedProcedure, router } from "../_core/trpc.js";

const status = z.enum(["new", "audit_in_progress", "audited", "follow_up", "hot", "meeting", "client", "unqualified", "paused"]);
const interest = z.enum(["unknown", "low", "medium", "high", "hot"]);

const ownerOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Accès administrateur requis" });
  return next();
});

export const qualifyRouter = router({
  summary: ownerOnly.query(() => getQualifySummary()),
  conversions: ownerOnly.query(() => getRecentConversionRequests()),
  prospect: ownerOnly.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getQualifyProspect(input.id)),
  update: ownerOnly.input(z.object({ id: z.number().int().positive(), status: status.optional(), interestLevel: interest.optional(), agentMode: z.enum(["active", "human"]).optional(), summary: z.string().max(10000).optional(), privateNotes: z.string().max(10000).optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
    await db.update(qualifyProspects).set({ status: input.status, interestLevel: input.interestLevel, agentMode: input.agentMode, summary: input.summary, privateNotes: input.privateNotes }).where(eq(qualifyProspects.id, input.id));
    return getQualifyProspect(input.id);
  }),
  addNote: ownerOnly.input(z.object({ prospectId: z.number().int().positive(), content: z.string().min(1).max(10000) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
    const inserted = await db.insert(qualifyNotes).values({ prospectId: input.prospectId, authorId: ctx.user.id, content: input.content });
    return { id: Number(inserted[0].insertId) };
  }),
  recordMessage: ownerOnly.input(z.object({ prospectId: z.number().int().positive(), direction: z.enum(["inbound", "outbound", "system"]), content: z.string().min(1).max(20000), discordMessageId: z.string().max(32).optional() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not configured" });
    await db.insert(qualifyMessages).values({ prospectId: input.prospectId, direction: input.direction, content: input.content, discordMessageId: input.discordMessageId ?? null });
    await db.update(qualifyProspects).set({ lastActivityAt: new Date() }).where(eq(qualifyProspects.id, input.prospectId));
    return { success: true as const };
  }),
});
