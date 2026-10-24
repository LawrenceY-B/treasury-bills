import type { HistoryOptions } from "../service/api.js";
import type { Display } from "./display.js";

const MAX_ROWS = 60;

// compact JSON: indentation only costs the model tokens
export const json = (data: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

const SHOW: Record<Display, (what: string) => string> = {
    chart: (what) =>
        `The user chose a chart. Before your written answer, draw a line chart of ${what} by date with a charting or visualization tool; ` +
        "if no such tool is available, show a short table instead.",
    table: () => "The user chose a table: show a short table of the key rows, no chart.",
    text: () => "The user chose text only: no chart or table, just the key numbers in prose.",
};

// The presentation instruction sits right next to the data, where the model follows it more reliably than server instructions
export const historyResult = (display: Display, what: string, data: unknown) => ({
    content: [
        { type: "text" as const, text: SHOW[display](what) },
        { type: "text" as const, text: JSON.stringify(data) },
    ],
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
