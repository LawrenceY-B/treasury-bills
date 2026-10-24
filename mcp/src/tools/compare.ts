import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiService } from "../service/api.js";
import type { RangeChange } from "../service/types.js";
import { askDisplay, fetchOnce, forget, isInputRequired } from "./display.js";
import { json, sample } from "./format.js";
import { displayArg, historyRange } from "./schemas.js";

type Point = { date: string; value: number | null };
type Series = { name: string; change: RangeChange | null; rows: Point[] };

const round = (n: number) => Math.round(n * 100) / 100;

// first value = 100, so series on different scales (an index vs a GH¢7 stock) share one chart
const rebase = (rows: Point[]) => {
    const base = rows.find((r) => r.value !== null)?.value;
    return rows.map((r) => ({ ...r, rebased: base && r.value !== null ? round((r.value / base) * 100) : null }));
};

export const registerCompareTools = (server: McpServer, api: ApiService) => {
    server.registerTool("compare_history", {
        title: "Compare GSE Price Histories",
        description:
            "Price histories for several Ghana Stock Exchange stocks, optionally alongside the GSE Composite Index, in one call. " +
            "Each series has its % change over the range and daily rows with the value and a rebased value (first day = 100), so they chart on one scale. " +
            "Use this for any comparison (\"MTN vs the market\", \"GCB vs SCB this year\") instead of calling get_stock or get_market several times.",
        inputSchema: z.object({
            symbols: z.array(z.string().min(1)).min(1).max(5)
                .describe("GSE tickers, e.g. [\"MTNGH\", \"GCB\"]. Use list_stocks to find a company's symbol"),
            includeIndex: z.boolean().default(true).describe("Also include the GSE Composite Index (GSE-CI)"),
            ...historyRange,
            display: displayArg,
        }),
        annotations: { readOnlyHint: true },
    }, async ({ symbols, includeIndex, display: requested, ...range }, ctx) => {
        const tickers = [...new Set(symbols.map((s) => s.toUpperCase()))];
        const key = JSON.stringify(["compare_history", tickers, includeIndex, range]);
        const data = fetchOnce(key, () => Promise.all<Series>([
            ...tickers.map((symbol) => api.getStockHistory(symbol, range).then((h) => ({
                name: symbol,
                change: h.meta?.change ?? null,
                rows: h.data.map((p) => ({ date: p.date, value: p.close })),
            }))),
            ...(includeIndex
                ? [api.getMarketHistory(range).then((h) => ({
                    name: "GSE-CI",
                    change: h.meta?.change.gseCI ?? null,
                    rows: h.data.map((s) => ({ date: s.date, value: s.gseCI })),
                }))]
                : []),
        ]));
        const display = requested ?? askDisplay(server, ctx);
        if (isInputRequired(display)) return display;

        const series = await data.finally(() => forget(key));
        return json({
            display,
            series: series.map((s) => {
                const thinned = range.limit ? { rows: s.rows, sampled: false } : sample(s.rows);
                return { name: s.name, change: s.change, tradingDays: s.rows.length, sampled: thinned.sampled, rows: rebase(thinned.rows) };
            }),
        });
    });
};
