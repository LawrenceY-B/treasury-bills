import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { ApiService } from "./service/api.js";
import { registerMarketTools } from "./tools/market.js";
import { registerStockTools } from "./tools/stocks.js";
import { BOG_LOOKUP_RULE, registerTBillTools } from "./tools/tbills.js";

const INSTRUCTIONS = `Ghana Treasury bill rates (Bank of Ghana weekly auctions) and Ghana Stock Exchange (GSE) prices, indices and analysis. Prices are in GH¢.

- Find ticker symbols with list_stocks; don't guess them.
- For market-wide questions (how the market is doing, top movers, stocks vs T-bills) use get_market_insights instead of fetching many stocks.
- Answer in text first, with the key numbers. Don't draw charts or tables unless the user asked for one: they cost a lot of tokens.
- When the answer covers a trend over time or a comparison (a stock's price history, the GSE-CI over a period, several stocks side by side, T-bill rates across recent auctions), end with a one-line offer: "Want a chart or a table of this?"
- If the user asks for a chart and a charting or visualization tool is available, use it (e.g. a line chart of close or gseCI by date); if none is available, offer a short table instead. If they ask for a table, keep it to the key rows.
- Never chart a single value such as one current price or one rate.
- get_tbill_rates only has about the last month of auctions. ${BOG_LOOKUP_RULE}
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
    registerPrompts(server, api);
    registerResources(server, api);

    return server
}

void serveStdio(createServer);
console.error('treasury-bills MCP server running on stdio');
