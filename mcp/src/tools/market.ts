import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiService } from "../service/api.js";
import { askDisplay, isInputRequired } from "./display.js";
import { json, sample, wantsHistory } from "./format.js";
import { historyRange, insightPeriod } from "./schemas.js";

export const registerMarketTools = (server: McpServer, api: ApiService) => {
    server.registerTool("get_market", {
        title: "Get GSE Market Summary",
        description:
            "The Ghana Stock Exchange's latest market summary: GSE Composite Index (GSE-CI, all stocks), GSE Financial Stock Index (GSE-FSI, banks and financials), " +
            "total market cap (GH¢ million) and volume, each with its change from the previous trading day. " +
            "Add `period` (or `from`/`to`) to also get the daily index history and the GSE-CI's % change over that range. Index history starts in July 2023.",
        inputSchema: z.object(historyRange),
        annotations: { readOnlyHint: true },
    }, async (range, ctx) => {
        if (!wantsHistory(range)) return json(await api.getMarketData());

        // ask how to show it while the data loads
        const [display, latest, history] = await Promise.all([
            askDisplay(ctx),
            api.getMarketData(),
            api.getMarketHistory(range),
        ]);
        if (isInputRequired(display)) return display;
        const thinned = range.limit ? { rows: history.data, sampled: false } : sample(history.data);
        return json({
            ...latest,
            display,
            range: {
                period: history.meta?.period ?? null,
                from: history.meta?.from ?? null,
                to: history.meta?.to ?? null,
                tradingDays: history.meta?.count ?? history.data.length,
                change: history.meta?.change,
                sampled: thinned.sampled,
                rows: thinned.rows,
            },
        });
    });

    server.registerTool("get_market_insights", {
        title: "Get GSE Market Insights",
        description:
            "Precomputed analysis of the whole Ghana Stock Exchange over a period: plain-English summary, index and market-cap changes, " +
            "how many stocks rose or fell, top gainers and losers, most traded stocks, unusual volume, stocks near 52-week highs or lows, " +
            "and, for periods up to 1m, T-bill rates scaled to the same period for comparison (longer periods only get today's rates). " +
            "Use for 'how is the market doing', 'top movers', or 'stocks vs T-bills' questions instead of fetching every stock.",
        inputSchema: z.object({
            period: insightPeriod.optional().describe("Defaults to 1m. Options: 1d, 1w, 1m, 3m, 6m, ytd, 1y, 5y"),
        }),
        annotations: { readOnlyHint: true },
    }, async ({ period }) => json(await api.getInsights(period)));
};
