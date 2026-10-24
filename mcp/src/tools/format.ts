import type { HistoryOptions } from "../service/api.js";

const MAX_ROWS = 60;

// compact JSON: indentation only costs the model tokens
export const json = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

export const wantsHistory = (range: HistoryOptions) =>
    range.period !== undefined || range.from !== undefined || range.to !== undefined || range.limit !== undefined;

// Evenly thin long ranges, keeping the first and last row, so a 5y request doesn't flood the context.
// The range's change comes from the API's meta, so it stays exact.
export const sample = <T>(rows: T[], max = MAX_ROWS) => {
    if (rows.length <= max) return { rows, sampled: false };
    const step = (rows.length - 1) / (max - 1);
    return { rows: Array.from({ length: max }, (_, i) => rows[Math.round(i * step)]), sampled: true };
};
