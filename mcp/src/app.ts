import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { ApiService } from "./service/api.js";
import { registerMarketTools } from "./tools/market.js";
import { registerStockTools } from "./tools/stocks.js";
import { registerTBillTools } from "./tools/tbills.js";

function createServer(): McpServer {
    const server = new McpServer({
        name: "treasury-bills",
        version: "1.0.0",
        description: "Ghana Treasury Bill & Stock Exchange API",
    })

    const api = new ApiService();
    registerTBillTools(server, api);
    registerStockTools(server, api);
    registerMarketTools(server, api);

    return server
}

void serveStdio(createServer);
console.error('treasury-bills MCP server running on stdio');
