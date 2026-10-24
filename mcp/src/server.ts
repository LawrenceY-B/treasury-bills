import { McpServer } from "@modelcontextprotocol/server"
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";
import { ApiService } from "./service/api.js";
import { registerCompareTools } from "./tools/compare.js";
import { registerMarketTools } from "./tools/market.js";
import { registerStockTools } from "./tools/stocks.js";
import { BOG_LOOKUP_RULE, registerTBillTools } from "./tools/tbills.js";

const INSTRUCTIONS = `Ghana Treasury bill rates (Bank of Ghana weekly auctions) and Ghana Stock Exchange (GSE) prices, indices and analysis. Prices are in GH¢.

- Find ticker symbols with list_stocks; don't guess them.
- For market-wide questions (how the market is doing, top movers, stocks vs T-bills) use get_market_insights instead of fetching many stocks.
- For comparisons (several stocks, or a stock against the market), use compare_history: one call, so the user is asked once.
- When get_stock, get_market or compare_history return history, the user is asked how they want it shown, and the result's \`display\` field holds their choice. Follow it:
  - "chart" (the default): draw a chart with a charting or visualization tool if one is available (e.g. a line chart of close or gseCI by date); if none is available, show a short table instead.
  - "table": a short table of the key rows only.
  - "text": no chart or table, just the key numbers in prose.
- Ask once per conversation: after the user has chosen (a result's \`display\`), pass that same \`display\` on every later history call in this conversation, unless they ask to change it. Also pass it when the user explicitly asks for a chart, a table or text. Never pick it yourself; otherwise leave it out so the user is asked (chart by default).
- Never chart a single value such as one current price or one rate.
- get_tbill_rates only has about the last month of auctions. ${BOG_LOOKUP_RULE}
- When range.sampled is true, the rows are evenly thinned; range.change is still exact for the whole range.`;

const api = new ApiService();

export function createServer(): McpServer {
    const server = new McpServer({
        name: "lyb-cedi-market",
        version: "1.0.0",
        description: "Ghana Treasury Bill & Stock Exchange API",
    }, { instructions: INSTRUCTIONS })

    registerTBillTools(server, api);
    registerStockTools(server, api);
    registerMarketTools(server, api);
    registerCompareTools(server, api);
    registerPrompts(server, api);
    registerResources(server, api);

    return server
}
