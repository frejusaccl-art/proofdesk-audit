import { eq } from "drizzle-orm";
import { getDb, qualifyMessages, qualifyProspects } from "../db.js";
import { interestFromAnswers, normalized, qualificationPrompts } from "./qualification.js";

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const channelId = process.env.DISCORD_CHANNEL_ID;
const adminUserIds = new Set((process.env.DISCORD_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean));
const apiBase = "https://discord.com/api/v10";

if (!token) throw new Error("DISCORD_BOT_TOKEN is required to start the Discord worker");

const intents = 1 | 512 | 4096 | 32768; // GUILDS | GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT
type DiscordMessage = {
  id: string;
  channel_id: string;
  guild_id?: string;
  content: string;
  author: { id: string; bot?: boolean; username: string; global_name?: string | null };
};

type GatewayEvent = { op: number; t: string | null; d: any; s?: number };

async function discordFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function sendMessage(channel: string, content: string) {
  return discordFetch<{ id: string }>(`/channels/${channel}/messages`, { method: "POST", body: JSON.stringify({ content }) });
}

async function findOrCreateProspect(message: DiscordMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const existing = await db.select().from(qualifyProspects).where(eq(qualifyProspects.discordUserId, message.author.id)).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(qualifyProspects).values({
    discordUserId: message.author.id,
    discordUsername: message.author.username,
    displayName: message.author.global_name ?? message.author.username,
  });
  const created = await db.select().from(qualifyProspects).where(eq(qualifyProspects.id, Number(inserted[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Could not create Discord prospect");
  return created[0];
}

async function alreadyRecorded(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select({ id: qualifyMessages.id }).from(qualifyMessages).where(eq(qualifyMessages.discordMessageId, id)).limit(1);
  return Boolean(rows[0]);
}

async function recordMessage(prospectId: number, direction: "inbound" | "outbound", content: string, discordMessageId: string, metadata?: object) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(qualifyMessages).values({ prospectId, discordMessageId, direction, content, metadata: metadata ? JSON.stringify(metadata) : null });
  await db.update(qualifyProspects).set({ lastActivityAt: new Date() }).where(eq(qualifyProspects.id, prospectId));
}

async function updateAnswer(prospectId: number, step: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const field = (["activity", "situation", "mainProblem", "objective", "urgency", "budget"] as const)[step - 1];
  if (field) await db.update(qualifyProspects).set({ [field]: content }).where(eq(qualifyProspects.id, prospectId));
}

async function handleMessage(message: DiscordMessage) {
  if (message.author.bot || adminUserIds.has(message.author.id) || !message.content.trim()) return;
  if (guildId && message.guild_id && message.guild_id !== guildId) return;
  if (channelId && message.channel_id !== channelId) return;
  if (await alreadyRecorded(message.id)) return;

  const content = normalized(message.content);
  const prospect = await findOrCreateProspect(message);
  await recordMessage(prospect.id, "inbound", content, message.id, { channelId: message.channel_id, guildId: message.guild_id });

  // The dashboard's human takeover is authoritative: store the message, but never reply.
  if (prospect.agentMode === "human") return;

  const db = await getDb();
  if (!db) throw new Error("Database is not configured");

  if (prospect.auditStep === 0) {
    const reply = `Bonjour ${prospect.displayName ?? ""}, je vais vous poser quelques questions courtes pour comprendre votre situation. ${qualificationPrompts[0]}`;
    const sent = await sendMessage(message.channel_id, reply);
    await recordMessage(prospect.id, "outbound", reply, sent.id);
    await db.update(qualifyProspects).set({ auditStep: 1, status: "audit_in_progress" }).where(eq(qualifyProspects.id, prospect.id));
    return;
  }

  await updateAnswer(prospect.id, prospect.auditStep, content);
  const nextStep = prospect.auditStep + 1;
  if (nextStep <= qualificationPrompts.length) {
    const reply = qualificationPrompts[nextStep - 1];
    const sent = await sendMessage(message.channel_id, reply);
    await recordMessage(prospect.id, "outbound", reply, sent.id);
    await db.update(qualifyProspects).set({ auditStep: nextStep }).where(eq(qualifyProspects.id, prospect.id));
    return;
  }

  const interestLevel = interestFromAnswers(prospect.urgency, content);
  const reply = "Merci, j’ai assez d’éléments pour préparer la suite. Un membre de l’équipe va vérifier les informations et revenir vers vous. Si vous avez une échéance précise, vous pouvez encore me l’indiquer ici.";
  const sent = await sendMessage(message.channel_id, reply);
  await recordMessage(prospect.id, "outbound", reply, sent.id);
  await db.update(qualifyProspects).set({ status: interestLevel === "hot" ? "hot" : "audited", interestLevel, summary: "Qualification Discord complétée ; validation humaine requise avant toute recommandation." }).where(eq(qualifyProspects.id, prospect.id));
}

async function connect() {
  const gateway = await discordFetch<{ url: string }>("/gateway/bot");
  const socket = new WebSocket(`${gateway.url}?v=10&encoding=json`);
  let sequence: number | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  socket.onmessage = (event) => {
    const packet = JSON.parse(String(event.data)) as GatewayEvent;
    if (packet.s !== undefined) sequence = packet.s;
    if (packet.op === 10) {
      const interval = Number(packet.d.heartbeat_interval);
      heartbeat = setInterval(() => socket.send(JSON.stringify({ op: 1, d: sequence })), interval);
      socket.send(JSON.stringify({ op: 2, d: { token, intents, properties: { os: "linux", browser: "proofdesk", device: "proofdesk" } } }));
      console.log(`[Discord] Gateway connected; scope guild=${guildId ?? "all"}, channel=${channelId ?? "all"}`);
    } else if (packet.op === 0 && packet.t === "MESSAGE_CREATE") {
      void handleMessage(packet.d as DiscordMessage).catch((error: unknown) => console.error("[Discord] Message handling failed:", error));
    } else if (packet.op === 7) {
      socket.close();
    }
  };
  socket.onerror = (error) => console.error("[Discord] Gateway error:", error);
  socket.onclose = () => {
    if (heartbeat) clearInterval(heartbeat);
    console.warn("[Discord] Gateway closed; reconnecting in 5 seconds");
    setTimeout(() => void connect(), 5000);
  };
}

void connect().catch((error: unknown) => {
  console.error("[Discord] Worker failed to connect:", error);
  process.exitCode = 1;
});
