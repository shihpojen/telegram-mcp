import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";

const { BOT_TOKEN, CHAT_ID, PORT = "8080" } = process.env;

const app = express();
app.use(express.json());

const transports = new Map();

app.get("/sse", async (req, res) => {
  const server = new McpServer({ name: "telegram-sender", version: "1.0.0" });

  server.tool(
    "send_message",
    { text: z.string().describe("HTML-formatted message to send via Telegram") },
    async ({ text }) => {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      const data = await r.json();
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);
  res.on("close", () => transports.delete(transport.sessionId));
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const transport = transports.get(req.query.sessionId);
  if (!transport) return res.status(404).send("Session not found");
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_req, res) => res.send("OK"));

app.listen(parseInt(PORT), () => console.log(`Telegram MCP server on port ${PORT}`));
