import { NextFunction, Request, Response } from "express";
import { IMarketSummary, IStock, IStockPrice } from "../interfaces/gse.interface";
import MarketSummary from "../models/marketSummary.model";
import Stock from "../models/stock.model";
import StockPrice from "../models/stockPrice.model";
import {
  formatPrice,
  formatSummary,
  httpError,
  isoDate,
  parseDateParam,
  parseLimit,
  percentChange,
  round,
} from "../utils/gse.format";
import { buildInsights } from "../utils/gse.insights";
import { HISTORY_PERIODS, INSIGHT_PERIODS, parsePeriod, periodStart } from "../utils/gse.periods";

const latestTradingDay = async () => {
  const latest = await StockPrice.findOne().sort({ date: -1 }).lean<IStockPrice>();
  if (!latest) throw httpError(503, "No GSE data yet, the first sync hasn't run");
  return latest.date;
};

// from/to (exact dates) win; otherwise a chart-style period counted back from the latest trading day
const historyRange = async (req: Request, latestDate: () => Promise<Date | undefined>) => {
  const from = parseDateParam(req.query.from, "from");
  const to = parseDateParam(req.query.to, "to");
  if (from && to && from > to) throw httpError(400, "from must be on or before to");
  if (from || to)
    return { period: null, filter: { date: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } };

  const period = parsePeriod(req.query.period, HISTORY_PERIODS, "1y");
  const latest = await latestDate();
  if (!latest) return { period, filter: {} };
  // rows after the period's start day, so meta.change is measured from that day's close (same as /insights)
  return { period, filter: { date: period === "1d" ? { $gte: latest } : { $gt: periodStart(period, latest) } } };
};

// Change over the range, measured from the last value before it (like a chart header)
const rangeChange = (baseline: number | null | undefined, last: number | null | undefined) => ({
  from: baseline ?? null,
  to: last ?? null,
  changePercent: percentChange(baseline, last),
});

// GET /api/gse/stocks?all=true
export const getStocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = new Map((await Stock.find().lean<IStock[]>()).map((s) => [s.symbol, s]));

    if (req.query.all === "true") {
      const symbols = await StockPrice.aggregate<{ _id: string; firstDate: Date; lastDate: Date; days: number }>([
        { $group: { _id: "$symbol", firstDate: { $min: "$date" }, lastDate: { $max: "$date" }, days: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const data = symbols.map((s) => ({
        symbol: s._id,
        name: companies.get(s._id)?.name ?? null,
        board: companies.get(s._id)?.board ?? null,
        firstDate: isoDate(s.firstDate),
        lastDate: isoDate(s.lastDate),
        tradingDays: s.days,
      }));
      res.status(200).json({ success: true, data, meta: { count: data.length } });
      return;
    }

    const date = await latestTradingDay();
    const prices = await StockPrice.find({ date }).sort({ symbol: 1 }).lean<IStockPrice[]>();
    const data = prices.map((p) => ({
      symbol: p.symbol,
      name: companies.get(p.symbol)?.name ?? null,
      board: companies.get(p.symbol)?.board ?? null,
      price: p.close,
      change: p.change,
      changePercent: p.changePercent,
      volume: p.volume,
    }));
    res.status(200).json({ success: true, data, meta: { date: isoDate(date), count: data.length, currency: "GHS" } });
  } catch (error) {
    next(error);
  }
};

const findSymbol = async (raw: string) => {
  const symbol = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const latest = await StockPrice.findOne({ symbol }).sort({ date: -1 }).lean<IStockPrice>();
  if (!latest) throw httpError(404, `Unknown symbol ${raw}. See /api/gse/stocks for valid symbols`);
  return { symbol, latest };
};

// GET /api/gse/stocks/:symbol
export const getStock = async (req: Request<{ symbol: string }>, res: Response, next: NextFunction) => {
  try {
    const { symbol, latest } = await findSymbol(req.params.symbol);
    const company = await Stock.findOne({ symbol }).lean<IStock>();
    const [first] = await StockPrice.find({ symbol }).sort({ date: 1 }).limit(1).lean<IStockPrice[]>();
    res.status(200).json({
      success: true,
      data: {
        symbol,
        name: company?.name ?? null,
        board: company?.board ?? null,
        listedDate: company?.listedDate ? isoDate(company.listedDate) : null,
        quote: formatPrice(latest),
        history: { firstDate: isoDate(first.date), lastDate: isoDate(latest.date), tradingDays: await StockPrice.countDocuments({ symbol }) },
      },
      meta: { currency: "GHS" },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/gse/stocks/:symbol/history?period=1y (or from=&to=), optional limit
export const getStockHistory = async (req: Request<{ symbol: string }>, res: Response, next: NextFunction) => {
  try {
    const { symbol, latest } = await findSymbol(req.params.symbol);
    const { period, filter } = await historyRange(req, async () => latest.date);
    const limit = parseLimit(req.query.limit, 0, 10000); // 0 = no cap
    // newest `limit` days in the range, returned oldest -> newest
    const rows = (
      await StockPrice.find({ symbol, ...filter }).sort({ date: -1 }).limit(limit).lean<IStockPrice[]>()
    ).reverse();
    const before = rows[0] && (await StockPrice.findOne({ symbol, date: { $lt: rows[0].date } }).sort({ date: -1 }).lean<IStockPrice>());
    const data = rows.map(formatPrice);
    res.status(200).json({
      success: true,
      data,
      meta: {
        symbol,
        period,
        from: data[0]?.date ?? null,
        to: data.at(-1)?.date ?? null,
        count: data.length,
        change: rangeChange(before ? before.close : rows[0]?.close, rows.at(-1)?.close),
        currency: "GHS",
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/gse/market
export const getMarket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [latest, previous] = await MarketSummary.find().sort({ date: -1 }).limit(2).lean<IMarketSummary[]>();
    if (!latest) throw httpError(503, "No GSE data yet, the first sync hasn't run");
    const metric = (key: "gseCI" | "gseFSI" | "marketCap" | "volume") => ({
      value: latest[key],
      change: previous && latest[key] !== null && previous[key] !== null ? round(latest[key]! - previous[key]!) : null,
      changePercent: percentChange(previous?.[key], latest[key]),
    });
    res.status(200).json({
      success: true,
      data: {
        date: isoDate(latest.date),
        previousDate: previous ? isoDate(previous.date) : null,
        gseCI: metric("gseCI"),
        gseFSI: metric("gseFSI"),
        marketCapMillion: metric("marketCap"),
        volume: metric("volume"),
      },
      meta: {
        gseCI: "GSE Composite Index: all listed stocks",
        gseFSI: "GSE Financial Stock Index: banks and other financial stocks",
        marketCapMillion: "Total value of listed companies, in millions of GH¢",
        volume: "Shares traded that day",
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/gse/market/history?period=1y (or from=&to=), optional limit
export const getMarketHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period, filter } = await historyRange(req, async () =>
      (await MarketSummary.findOne().sort({ date: -1 }).lean<IMarketSummary>())?.date
    );
    const limit = parseLimit(req.query.limit, 0, 10000); // 0 = no cap
    const rows = (await MarketSummary.find(filter).sort({ date: -1 }).limit(limit).lean<IMarketSummary[]>()).reverse();
    const before = rows[0] && (await MarketSummary.findOne({ date: { $lt: rows[0].date } }).sort({ date: -1 }).lean<IMarketSummary>());
    const data = rows.map(formatSummary);
    res.status(200).json({
      success: true,
      data,
      meta: {
        period,
        from: data[0]?.date ?? null,
        to: data.at(-1)?.date ?? null,
        count: data.length,
        change: { gseCI: rangeChange(before ? before.gseCI : rows[0]?.gseCI, rows.at(-1)?.gseCI) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/gse/insights?period=1m
export const getInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = parsePeriod(req.query.period, INSIGHT_PERIODS, "1m");
    res.status(200).json({ success: true, data: await buildInsights(period) });
  } catch (error) {
    next(error);
  }
};
