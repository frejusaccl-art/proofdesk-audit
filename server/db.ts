import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, auditEvents, auditLeads, evidence, organizationMembers, organizations, questionnaires, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function makeSlug(name: string, userId: number) {
  const clean = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "workspace";
  return `${clean}-${userId}`;
}

export async function ensureWorkspace(userId: number, userName?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const existing = await db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const name = userName ? `${userName} workspace` : "Mon workspace ProofDesk";
  const inserted = await db.insert(organizations).values({ name, slug: makeSlug(name, userId) });
  const organizationId = Number(inserted[0].insertId);
  await db.insert(organizationMembers).values({ organizationId, userId, role: "owner" });
  const created = await db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)))
    .limit(1);
  if (!created[0]) throw new Error("Workspace creation failed");
  return created[0];
}

export async function getWorkspaceSummary(userId: number, userName?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const { organization, membership } = await ensureWorkspace(userId, userName);
  const [questionnaireRows, evidenceRows, questionnaireCount, evidenceCount] = await Promise.all([
    db.select().from(questionnaires).where(eq(questionnaires.organizationId, organization.id)).orderBy(desc(questionnaires.updatedAt)).limit(12),
    db.select().from(evidence).where(eq(evidence.organizationId, organization.id)).orderBy(desc(evidence.updatedAt)).limit(12),
    db.select({ count: sql<number>`count(*)` }).from(questionnaires).where(eq(questionnaires.organizationId, organization.id)),
    db.select({ count: sql<number>`count(*)` }).from(evidence).where(eq(evidence.organizationId, organization.id)),
  ]);
  return {
    organization,
    membership,
    questionnaires: questionnaireRows,
    evidence: evidenceRows,
    stats: { questionnaires: Number(questionnaireCount[0]?.count ?? 0), evidence: Number(evidenceCount[0]?.count ?? 0) },
  };
}

export async function getUserOrganization(userId: number, userName?: string | null) {
  return (await ensureWorkspace(userId, userName)).organization;
}

export { auditEvents, auditLeads, evidence, organizationMembers, organizations, questionnaires, users };
