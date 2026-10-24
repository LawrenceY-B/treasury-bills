import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { createServer } from "./server.js";

void serveStdio(createServer);
console.error('lyb-cedi-market MCP server running on stdio');
