import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { ApiService } from "./service/api.js";
import { registerMarketTools } from "./tools/market.js";
import { registerStockTools } from "./tools/stocks.js";
import { registerTBillTools } from "./tools/tbills.js";

const INSTRUCTIONS = `Ghana Treasury bill rates (Bank of Ghana weekly auctions) and Ghana Stock Exchange (GSE) prices, indices and analysis. Prices are in GH¢.

- Find ticker symbols with list_stocks; don't guess them.
- For market-wide questions (how the market is doing, top movers, stocks vs T-bills) use get_market_insights instead of fetching many stocks.
- Visualize when it helps: for trends over time or comparisons (a stock's price history, the GSE-CI over a period, several stocks side by side, T-bill rates across recent auctions), fetch the data with a period and, if a charting or visualization tool is available in this session, use it to draw a chart (e.g. a line chart of close or gseCI by date). If none is available, show a short table of key points instead.
- Don't chart a single value such as one current price or one rate.
- When range.sampled is true, the rows are evenly thinned; range.change is still exact for the whole range.`;

function createServer(): McpServer {
    const server = new McpServer({
        name: "treasury-bills",
        version: "1.0.0",
        description: "Ghana Treasury Bill & Stock Exchange API",
    }, { instructions: INSTRUCTIONS })

    const api = new ApiService();
    registerTBillTools(server, api);
    registerStockTools(server, api);
    registerMarketTools(server, api);

    return server
}

void serveStdio(createServer);
console.error('treasury-bills MCP server running on stdio');
