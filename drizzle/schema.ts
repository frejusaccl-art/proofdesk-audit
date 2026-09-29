import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member", "reviewer"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  organizationUserUnique: uniqueIndex("organization_user_unique").on(table.organizationId, table.userId),
}));

export const questionnaires = mysqlTable("questionnaires", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 191 }).notNull(),
  company: varchar("company", { length: 191 }).notNull(),
  status: mysqlEnum("status", ["draft", "in_review", "approved", "shared"]).default("draft").notNull(),
  dueAt: timestamp("dueAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  title: varchar("title", { length: 191 }).notNull(),
  kind: varchar("kind", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["valid", "expiring", "expired"]).default("valid").notNull(),
  ownerName: varchar("ownerName", { length: 191 }),
  expiresAt: timestamp("expiresAt"),
  fileKey: varchar("fileKey", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLeads = mysqlTable("auditLeads", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 120 }),
  lastName: varchar("lastName", { length: 120 }),
  role: varchar("role", { length: 191 }),
  score: int("score").notNull(),
  currentHours: int("currentHours").notNull(),
  opportunityValue: int("opportunityValue"),
  nextStep: varchar("nextStep", { length: 80 }),
  answers: text("answers").notNull(),
  consentAt: timestamp("consentAt"),
  consentVersion: varchar("consentVersion", { length: 40 }),
  consentPurpose: varchar("consentPurpose", { length: 255 }),
  source: varchar("source", { length: 80 }),
  utmSource: varchar("utmSource", { length: 120 }),
  utmMedium: varchar("utmMedium", { length: 120 }),
  utmCampaign: varchar("utmCampaign", { length: 120 }),
  pdfGeneratedAt: timestamp("pdfGeneratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 80 }).notNull(),
  sessionId: varchar("sessionId", { length: 120 }),
  path: varchar("path", { length: 255 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type AuditLead = typeof auditLeads.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
