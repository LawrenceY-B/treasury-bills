import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/server";
import type { ApiService } from "./service/api.js";
import { symbolCompleter } from "./completions.js";

const jsonContents = (uri: URL, data: unknown) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(data) }],
});

export const registerResources = (server: McpServer, api: ApiService) => {
    server.registerResource("stocks", "gse://stocks", {
        title: "GSE Listed Stocks",
        description: "Every symbol ever listed on the Ghana Stock Exchange, with company name, board and first/last trading day",
        mimeType: "application/json",
    }, async (uri) => {
        const symbols = await api.getListedSymbols();
        return jsonContents(uri, symbols);
    });

    // One attachable resource per stock trading today, e.g. gse://stocks/MTNGH
    server.registerResource("stock", new ResourceTemplate("gse://stocks/{symbol}", {
        list: async () => {
            const { data } = await api.getStocks();
            return {
                resources: data.map((s) => ({
                    uri: `gse://stocks/${s.symbol}`,
                    name: s.symbol,
                    title: s.name ?? s.symbol,
                    mimeType: "application/json",
                })),
            };
        },
        complete: { symbol: symbolCompleter(api) },
    }), {
        title: "GSE Stock",
        description: "Company details and latest quote for one Ghana Stock Exchange stock",
        mimeType: "application/json",
    }, async (uri, { symbol }) => {
        const stock = await api.getStock(String(symbol));
        return jsonContents(uri, stock);
    });
};
