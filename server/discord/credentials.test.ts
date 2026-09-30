import { describe, expect, it } from "vitest";

describe("Discord credentials", () => {
  it("authenticates the configured bot token against Discord", async () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      expect(token).toBeDefined();
      return;
    }

    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });

    expect(response.status).toBe(200);
    const bot = (await response.json()) as { bot?: boolean };
    expect(bot.bot).toBe(true);
  }, 15000);
});
