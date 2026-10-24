import { completable, type McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiService, InsightPeriod } from "./service/api.js";
import { symbolCompleter } from "./completions.js";
import { BOG_LOOKUP_RULE } from "./tools/tbills.js";

// annual is the past 12 months; year-to-date runs from 1 January
const BRIEFS = {
    weekly: { period: "1w", label: "weekly", span: "past week", words: 250 },
    monthly: { period: "1m", label: "monthly", span: "past month", words: 300 },
    quarterly: { period: "3m", label: "quarterly", span: "past 3 months", words: 400 },
    "semi-annual": { period: "6m", label: "semi-annual", span: "past 6 months", words: 450 },
    annual: { period: "1y", label: "annual (past 12 months)", span: "past 12 months", words: 500 },
    "year-to-date": { period: "ytd", label: "year-to-date", span: "year to date", words: 450 },
} satisfies Record<string, { period: InsightPeriod; label: string; span: string; words: number }>;
type Frequency = keyof typeof BRIEFS;
const FREQUENCIES = Object.keys(BRIEFS) as [Frequency, ...Frequency[]];

// the history tools ask the user (chart by default) and return the answer as `display`
const SHOW_AS = (subject: string) =>
    `Show ${subject} the way the tool result's \`display\` field says: a chart (the default), a short table, or text only.`;

const userMessage =(text: string) => ({
    messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
});

const frequencyArg = (defaultText: string) =>
    completable(
        z.enum(FREQUENCIES).describe(`${FREQUENCIES.join(", ")}. ${defaultText}`),
        (value) => FREQUENCIES.filter((f) => f.startsWith((value ?? "").toLowerCase())),
    ).optional();

export const registerPrompts = (server: McpServer, api: ApiService) => {
    server.registerPrompt("market_brief", {
        title: "GSE Market Brief",
        description: "A brief on the Ghana Stock Exchange: weekly, monthly, quarterly, semi-annual, annual or year-to-date",
        argsSchema: z.object({
            frequency: frequencyArg("Defaults to weekly"),
        }),
    }, ({ frequency = "weekly" }) => {
        const { period, label, words } = BRIEFS[frequency];
        // get_tbill_rates only covers about the last month; longer briefs need the BoG's history from the web
        const tBillsFromTools = period === "1w" || period === "1m";
        const tBillStep = tBillsFromTools
            ? "3. get_tbill_rates for the latest rates of all three tenors."
            : `3. The lyb-cedi-market tools only have about the last month of T-bill rates. ${BOG_LOOKUP_RULE}`;
        return userMessage(
            `Write the ${label} market brief for the Ghana Stock Exchange (period "${period}").

Use the lyb-cedi-market tools:
1. get_market_insights with period "${period}" for the overall picture.
2. get_market with period "${period}" for the GSE Composite Index history.
${tBillStep}

Structure the brief as:
- Headline: how the GSE-CI and GSE-FSI moved, in one or two sentences.
- Top 3 gainers and top 3 losers, with % changes.
- Anything unusual: heavy volume, stocks near 52-week highs or lows.
- Stocks vs T-bills: the market's return against the 91- and 364-day bills over the same period${tBillsFromTools ? "" : ", using only rates from bog.gov.gh and citing the page"}.
- ${SHOW_AS("the GSE-CI over the period")}

Keep it under ${words} words, use GH¢ for prices, and don't give investment advice.`
        );
    });

    server.registerPrompt("analyze_stock", {
        title: "Analyze a GSE Stock",
        description: "Performance of one Ghana Stock Exchange stock over a chosen period (weekly to annual), or this year and the past 12 months by default",
        argsSchema: z.object({
            symbol: completable(z.string().describe("GSE ticker, e.g. MTNGH"), symbolCompleter(api)),
            frequency: frequencyArg("Leave out for both year-to-date and the past 12 months"),
        }),
    }, ({ symbol, frequency }) => {
        const ticker = symbol.toUpperCase();
        // no frequency: the original two-view analysis (this year and the past 12 months)
        const views = frequency ? [BRIEFS[frequency]] : [BRIEFS["year-to-date"], BRIEFS.annual];
        const fetches = views.map((v) => `period "${v.period}"`).join(", then again with ");
        const returns = views.map((v) => `the ${v.span}`).join(" and ");
        const chartSpan = views[views.length - 1].span;
        return userMessage(
            `Analyze the Ghana Stock Exchange stock ${ticker}${frequency ? ` over the ${BRIEFS[frequency].span}` : ""}.

Use the lyb-cedi-market tools: get_stock with symbol "${ticker}" and ${fetches}.

Cover:
- What the company is and its latest price (GH¢) and daily move.
- Its return over ${returns}.
- Where the price sits in its 52-week range, and whether recent volume is unusual.
- ${SHOW_AS(`the closing price over the ${chartSpan}`)}

If the symbol is unknown, use list_stocks to suggest the closest matches. Be factual and don't give investment advice.`
        );
    });
};
