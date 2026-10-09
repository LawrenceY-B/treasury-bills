import { IMarketSummary, IStockPrice } from "../interfaces/gse.interface";

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export const percentChange = (from: number | null | undefined, to: number | null | undefined) =>
  from && to !== null && to !== undefined ? round(((to - from) / from) * 100) : null;

// Error with an HTTP status, picked up by middleware/ErrorHandler
export const httpError = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });

// "2026-10-08" -> Date, anything else -> 400
export const parseDateParam = (value: unknown, name: string) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value)))
    throw httpError(400, `Invalid ${name}: use YYYY-MM-DD, e.g. ${name}=2026-01-31`);
  return new Date(value + "T00:00:00Z");
};

export const parseLimit = (value: unknown, fallback: number, max: number) => {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max)
    throw httpError(400, `Invalid limit: use a whole number from 1 to ${max}`);
  return n;
};

export const formatPrice = (p: IStockPrice) => ({
  date: isoDate(p.date),
  open: p.open,
  close: p.close,
  last: p.last,
  previousClose: p.previousClose,
  change: p.change,
  changePercent: p.changePercent,
  bid: p.bid,
  ask: p.ask,
  volume: p.volume,
  value: p.value,
  yearHigh: p.yearHigh,
  yearLow: p.yearLow,
});

export const formatSummary = (s: IMarketSummary) => ({
  date: isoDate(s.date),
  gseCI: s.gseCI,
  gseFSI: s.gseFSI,
  marketCapMillion: s.marketCap,
  volume: s.volume,
});
