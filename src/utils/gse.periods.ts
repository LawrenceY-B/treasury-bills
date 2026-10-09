import { httpError } from "./gse.format";

// Chart-style ranges, counted back from the latest trading day in the data
export const PERIODS = {
  "1d": "on the last trading day",
  "1w": "over the past week",
  "1m": "over the past month",
  "3m": "over the past 3 months",
  "6m": "over the past 6 months",
  ytd: "so far this year",
  "1y": "over the past year",
  "5y": "over the past 5 years",
  max: "since records began",
} as const;
export type Period = keyof typeof PERIODS;

export const HISTORY_PERIODS = Object.keys(PERIODS) as Period[];
export const INSIGHT_PERIODS = HISTORY_PERIODS.filter((p) => p !== "max");

const DAY = 24 * 60 * 60 * 1000;

export const periodStart = (period: Period, latest: Date) => {
  const d = new Date(latest);
  if (period === "1w") return new Date(latest.getTime() - 7 * DAY);
  if (period === "1m") d.setUTCMonth(d.getUTCMonth() - 1);
  if (period === "3m") d.setUTCMonth(d.getUTCMonth() - 3);
  if (period === "6m") d.setUTCMonth(d.getUTCMonth() - 6);
  if (period === "1y") d.setUTCFullYear(d.getUTCFullYear() - 1);
  if (period === "5y") d.setUTCFullYear(d.getUTCFullYear() - 5);
  if (period === "ytd") return new Date(Date.UTC(latest.getUTCFullYear() - 1, 11, 31));
  if (period === "max") return new Date(0);
  return d; // 1d: the latest trading day itself
};

export const parsePeriod = (value: unknown, allowed: Period[], fallback: Period): Period => {
  if (value === undefined || value === "") return fallback;
  const period = String(value).toLowerCase() as Period;
  if (!allowed.includes(period)) throw httpError(400, `Invalid period: use one of ${allowed.join(", ")}`);
  return period;
};
