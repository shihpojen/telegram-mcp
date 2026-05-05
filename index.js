import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";

const { BOT_TOKEN, CHAT_ID, PORT = "8080" } = process.env;

const app = express();
app.use(express.json());

function createServer() {
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
  return server;
}

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
});

app.get("/health", (_req, res) => res.send("OK"));

app.listen(parseInt(PORT), () => console.log(`Telegram MCP server on port ${PORT}`));
