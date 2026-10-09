import { IMarketSummary, IStockPrice } from "../interfaces/gse.interface";
import MarketSummary from "../models/marketSummary.model";
import Stock from "../models/stock.model";
import StockPrice from "../models/stockPrice.model";
import TBillData from "../models/rate.model";
import { httpError, isoDate, percentChange, round } from "./gse.format";
import { Period, PERIODS, periodStart } from "./gse.periods";

const DAY = 24 * 60 * 60 * 1000;

const signed = (n: number | null, unit = "%") =>
  n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}${unit}`;

// "rose 2.1%", "fell 5.47%", "was flat"
const moved = (n: number | null, unit = "%") =>
  n === null || n === 0
    ? "was flat"
    : `${n > 0 ? "rose" : "fell"} ${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 2 })}${unit}`;

// Closing price per symbol on the last trading day on or before `date`
const closesAsOf = async (date: Date, symbols: string[]) => {
  const rows = await StockPrice.aggregate<{ _id: string; close: number | null; date: Date }>([
    { $match: { symbol: { $in: symbols }, date: { $lte: date, $gte: new Date(date.getTime() - 45 * DAY) } } },
    { $sort: { date: -1 } },
    { $group: { _id: "$symbol", close: { $first: "$close" }, date: { $first: "$date" } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.close]));
};

// Latest T-bill rate per tenor ("91 DAY BILL" etc.)
const latestTBills = async () => {
  const rows = await TBillData.find({}).lean();
  const byTenor = new Map<string, { tenor: string; date: Date; interestRate: number }>();
  for (const r of rows) {
    const date = new Date(r.days + " UTC");
    const tenor = r.securityType.replace(/\s*BILL$/i, "").toLowerCase();
    const current = byTenor.get(tenor);
    if (!isNaN(date.getTime()) && (!current || date > current.date))
      byTenor.set(tenor, { tenor, date, interestRate: Number(r.interestRate) });
  }
  return [...byTenor.values()].sort((a, b) => parseInt(a.tenor) - parseInt(b.tenor));
};

export const buildInsights = async (period: Period) => {
  const latestSummary = await MarketSummary.findOne().sort({ date: -1 }).lean<IMarketSummary>();
  const latestPrice = await StockPrice.findOne().sort({ date: -1 }).lean<IStockPrice>();
  if (!latestSummary || !latestPrice) throw httpError(503, "No GSE data yet, the first sync hasn't run");

  const latestDate = latestPrice.date;
  const start = periodStart(period, latestDate);
  const days = Math.max(1, Math.round((latestDate.getTime() - start.getTime()) / DAY));

  // Market: compare the latest summary with the one at the start of the period
  const baseSummary = await MarketSummary.findOne(
    period === "1d" ? { date: { $lt: latestSummary.date } } : { date: { $lte: start } }
  )
    .sort({ date: -1 })
    .lean<IMarketSummary>()
    // index data starts in 2023, so long periods fall back to the earliest summary
    .then((found) => found ?? MarketSummary.findOne().sort({ date: 1 }).lean<IMarketSummary>());
  const market = {
    from: baseSummary ? isoDate(baseSummary.date) : null,
    to: isoDate(latestSummary.date),
    gseCI: { value: latestSummary.gseCI, changePercent: percentChange(baseSummary?.gseCI, latestSummary.gseCI) },
    gseFSI: { value: latestSummary.gseFSI, changePercent: percentChange(baseSummary?.gseFSI, latestSummary.gseFSI) },
    marketCapMillion: {
      value: latestSummary.marketCap,
      change:
        baseSummary?.marketCap != null && latestSummary.marketCap != null
          ? round(latestSummary.marketCap - baseSummary.marketCap)
          : null,
    },
  };

  // Stocks: everything that has a price on the latest trading day
  const today = await StockPrice.find({ date: latestDate }).lean<IStockPrice[]>();
  const symbols = today.map((p) => p.symbol);
  const names = new Map((await Stock.find({ symbol: { $in: symbols } }).lean()).map((s) => [s.symbol, s.name]));
  const baseCloses = period === "1d" ? null : await closesAsOf(start, symbols);

  const moves = today
    .map((p) => {
      const base = baseCloses ? baseCloses.get(p.symbol) : p.previousClose;
      return { symbol: p.symbol, name: names.get(p.symbol) ?? null, from: base ?? null, to: p.close, changePercent: percentChange(base, p.close) };
    })
    .filter((m) => m.changePercent !== null) as { symbol: string; name: string | null; from: number; to: number; changePercent: number }[];

  const byChange = [...moves].sort((a, b) => b.changePercent - a.changePercent);
  const breadth = {
    up: moves.filter((m) => m.changePercent > 0).length,
    down: moves.filter((m) => m.changePercent < 0).length,
    unchanged: moves.filter((m) => m.changePercent === 0).length,
  };

  const mostTraded = await StockPrice.aggregate<{ _id: string; value: number; volume: number }>([
    { $match: { date: period === "1d" ? latestDate : { $gt: start, $lte: latestDate } } },
    { $group: { _id: "$symbol", value: { $sum: "$value" }, volume: { $sum: "$volume" } } },
    { $match: { value: { $gt: 0 } } },
    { $sort: { value: -1 } },
    { $limit: 5 },
  ]);

  // Unusual activity: latest volume vs the 20 trading days before it
  const averages = await StockPrice.aggregate<{ _id: string; avgVolume: number }>([
    { $match: { symbol: { $in: symbols }, date: { $lt: latestDate, $gte: new Date(latestDate.getTime() - 40 * DAY) } } },
    { $sort: { date: -1 } },
    { $group: { _id: "$symbol", volumes: { $push: "$volume" } } },
    { $project: { avgVolume: { $avg: { $slice: ["$volumes", 20] } } } },
  ]);
  const avgBySymbol = new Map(averages.map((a) => [a._id, a.avgVolume]));
  const unusualVolume = today
    .map((p) => ({ symbol: p.symbol, volume: p.volume ?? 0, averageVolume: round(avgBySymbol.get(p.symbol) ?? 0, 0) }))
    .filter((u) => u.averageVolume > 0 && u.volume >= 3 * u.averageVolume)
    .map((u) => ({ ...u, timesAverage: round(u.volume / u.averageVolume, 1) }))
    .sort((a, b) => b.timesAverage - a.timesAverage);

  // only stocks with a real 52-week range (10%+), otherwise illiquid stocks show up as near both
  const hasRange = (p: IStockPrice) => !!(p.close && p.yearHigh && p.yearLow && p.yearHigh >= p.yearLow * 1.1);
  const near52WeekHigh = today
    .filter((p) => hasRange(p) && p.close! >= p.yearHigh! * 0.95)
    .map((p) => ({ symbol: p.symbol, close: p.close, yearHigh: p.yearHigh }));
  const near52WeekLow = today
    .filter((p) => hasRange(p) && p.close! <= p.yearLow! * 1.05)
    .map((p) => ({ symbol: p.symbol, close: p.close, yearLow: p.yearLow }));

  // T-bills: the annual rate scaled to the same number of days, for a like-for-like comparison
  const tBills = (await latestTBills()).map((t) => ({
    tenor: t.tenor,
    interestRate: t.interestRate,
    equivalentForPeriod: round((t.interestRate * days) / 365),
  }));

  const when = PERIODS[period];
  const ci = market.gseCI.changePercent;
  const fsi = market.gseFSI.changePercent;
  const summary: string[] = [];
  const indexNote = baseSummary && baseSummary.date > start ? ` (index data starts ${isoDate(baseSummary.date)})` : "";
  summary.push(`The market (GSE Composite Index) ${moved(ci)} ${when}${indexNote}, to ${latestSummary.gseCI?.toLocaleString("en-GB")}.`);
  if (ci !== null && fsi !== null)
    summary.push(
      `Banks and financials (GSE-FSI) ${moved(fsi)}, ${
        Math.abs(fsi - ci) < 0.5 ? "in line with" : fsi > ci ? "beating" : "lagging"
      } the overall market.`
    );
  const capChange = market.marketCapMillion.change;
  if (capChange !== null)
    summary.push(
      `Total market value ${capChange === 0 ? "was unchanged" : `${capChange > 0 ? "grew" : "fell"} by GH¢${Math.abs(capChange).toLocaleString("en-GB")} million`}, to GH¢${latestSummary.marketCap?.toLocaleString("en-GB")} million.`
    );
  summary.push(`${breadth.up} stocks rose, ${breadth.down} fell and ${breadth.unchanged} were unchanged.`);
  if (byChange[0]?.changePercent > 0) summary.push(`Best performer: ${byChange[0].symbol} (${signed(byChange[0].changePercent)}).`);
  const worst = byChange[byChange.length - 1];
  if (worst?.changePercent < 0) summary.push(`Worst performer: ${worst.symbol} (${signed(worst.changePercent)}).`);
  if (mostTraded[0]) summary.push(`Most traded by value: ${mostTraded[0]._id} (GH¢${round(mostTraded[0].value, 0).toLocaleString("en-GB")}).`);
  for (const u of unusualVolume.slice(0, 3))
    summary.push(`${u.symbol} traded ${u.timesAverage}× its usual volume on ${isoDate(latestDate)}.`);
  const longest = tBills[tBills.length - 1];
  if (longest && ci !== null)
    summary.push(
      `For comparison, the ${longest.tenor} T-bill pays ${longest.interestRate}% a year, about ${longest.equivalentForPeriod}% over the same ${days} ${days === 1 ? "day" : "days"}, versus ${signed(ci)} for the market.`
    );

  return {
    period,
    from: isoDate(start),
    to: isoDate(latestDate),
    summary,
    market,
    breadth,
    topGainers: byChange.filter((m) => m.changePercent > 0).slice(0, 5),
    topLosers: byChange.filter((m) => m.changePercent < 0).reverse().slice(0, 5),
    mostTraded: mostTraded.map((m) => ({ symbol: m._id, name: names.get(m._id) ?? null, value: round(m.value), volume: m.volume })),
    unusualVolume,
    near52WeekHigh,
    near52WeekLow,
    tBills,
  };
};
