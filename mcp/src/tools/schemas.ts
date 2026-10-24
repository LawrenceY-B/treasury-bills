import { z } from "zod";

export const period = z
    .enum(["1d", "1w", "1m", "3m", "6m", "ytd", "1y", "5y", "max"])
    .describe("Range counted back from the latest trading day: 1d, 1w, 1m, 3m, 6m, ytd (year to date), 1y, 5y or max (all data)");

export const insightPeriod = z
    .enum(["1d", "1w", "1m", "3m", "6m", "ytd", "1y", "5y"])
    .describe("Range counted back from the latest trading day: 1d, 1w, 1m, 3m, 6m, ytd (year to date), 1y or 5y");

export const displayArg = z
    .enum(["chart", "table", "text"])
    .optional()
    .describe("Set this to the choice the user already made in this conversation (an earlier result's `display`), or when they explicitly ask for a chart, a table or text. " +
        "Never choose it yourself (not even to save tokens): leave it out and the user is asked once, with chart as the default");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// shared by get_stock and get_market; any of these turns on the history in the response
export const historyRange = {
    period: period.optional(),
    from: isoDate.optional().describe("Start date (YYYY-MM-DD). Use with or instead of `to` for an exact range; overrides `period`"),
    to: isoDate.optional().describe("End date (YYYY-MM-DD)"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe("Return only the most recent N trading days of the range, every row. Without it, long ranges are sampled down to about 60 rows"),
};
