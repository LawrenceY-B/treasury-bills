import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiService } from "../service/api.js";
import { askDisplay, fetchOnce, forget, isInputRequired } from "./display.js";
import { historyResult, json, sample, wantsHistory } from "./format.js";
import { displayArg, historyRange } from "./schemas.js";

export const registerStockTools = (server: McpServer, api: ApiService) => {
    server.registerTool("list_stocks", {
        title: "List GSE Stocks",
        description:
            "Lists Ghana Stock Exchange stocks. By default: every stock that traded on the latest trading day, with its price (GH¢), daily change and volume. " +
            "With all=true: every symbol ever listed, with its company name and first and last trading dates. " +
            "Use to find a company's ticker symbol, or for a snapshot of the whole market's prices.",
        inputSchema: z.object({
            all: z.boolean().optional().describe("true to include delisted and inactive symbols instead of today's prices"),
        }),
        annotations: { readOnlyHint: true },
    }, async ({ all }) => {
        if (all) return json(await api.getListedSymbols());
        const { data, meta } = await api.getStocks();
        return json({ date: meta?.date, currency: "GHS", stocks: data });
    });

    server.registerTool("get_stock", {
        title: "Get GSE Stock",
        description:
            "One Ghana Stock Exchange stock: company name, board and latest quote (prices in GH¢). " +
            "Add `period` (or `from`/`to`) to also get its daily price history and the % change over that range, e.g. period=ytd for this year's return. " +
            "History goes back to 2007 for older stocks. To compare several stocks or a stock against the market, use compare_history instead.",
        inputSchema: z.object({
            symbol: z.string().min(1).describe("GSE ticker, e.g. MTNGH, GCB, SCB. Case-insensitive. Use list_stocks to find a company's symbol"),
            ...historyRange,
            display: displayArg,
        }),
        annotations: { readOnlyHint: true },
    }, async ({ symbol, display: requested, ...range }, ctx) => {
        if (!wantsHistory(range)) return json(await api.getStock(symbol));

        // start loading, then ask how to show it; the retry after the answer reuses this fetch
        const key = JSON.stringify(["get_stock", symbol.toUpperCase(), range]);
        const data = fetchOnce(key, () => Promise.all([api.getStock(symbol), api.getStockHistory(symbol, range)]));
        const display = requested ?? askDisplay(server, ctx);
        if (isInputRequired(display)) return display;

        const [detail, history] = await data.finally(() => forget(key));
        const thinned = range.limit ? { rows: history.data, sampled: false } : sample(history.data);
        return historyResult(display, "range.rows[].close", {
            ...detail,
            display,
            range: {
                period: history.meta?.period ?? null,
                from: history.meta?.from ?? null,
                to: history.meta?.to ?? null,
                tradingDays: history.meta?.count ?? history.data.length,
                change: history.meta?.change,
                sampled: thinned.sampled,
                rows: thinned.rows.map((p) => ({ date: p.date, close: p.close, changePercent: p.changePercent, volume: p.volume })),
            },
        });
    });
};
