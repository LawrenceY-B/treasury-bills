import express from "express";
import { hostHeaderValidation, originValidation } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createServer } from "./server.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

const LOCAL = ["localhost", "127.0.0.1", "[::1]"];
const fromEnv = (name: string) => (process.env[name] ?? "").split(",").map((h) => h.trim()).filter(Boolean);

const allowedHosts = [
    ...LOCAL,
    ...(process.env.RENDER_EXTERNAL_HOSTNAME ? [process.env.RENDER_EXTERNAL_HOSTNAME] : []),
    ...fromEnv("ALLOWED_HOSTS"),
];
const allowedOrigins = [...LOCAL, ...fromEnv("ALLOWED_ORIGINS")];

const handler = createMcpHandler(createServer);
const mcp = toNodeHandler(handler);

// not createMcpExpressApp(): its checks cover every route, which could block Render's health check
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.all(
    "/mcp",
    hostHeaderValidation(allowedHosts),
    originValidation(allowedOrigins),
    (req, res) => void mcp(req, res, req.body), // Express has already read the body
);

app.use((_req, res) => {
    res.status(404).json({ error: "Not found. The MCP endpoint is /mcp" });
});

const httpServer = app.listen(PORT, HOST, () => {
    console.error(`lyb-cedi-market MCP server on http://${HOST}:${PORT}/mcp (hosts: ${allowedHosts.join(", ")})`);
});

const shutdown = async () => {
    await handler.close();
    httpServer.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
