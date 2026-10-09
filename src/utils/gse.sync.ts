import { Board, IMarketSummary, IStock, IStockPrice } from "../interfaces/gse.interface";
import MarketSummary from "../models/marketSummary.model";
import Stock from "../models/stock.model";
import StockPrice from "../models/stockPrice.model";
import { round } from "./gse.format";
import { cleanText, fetchTable, GSE_TABLES, toDate, toNumber, toSymbol } from "./gse.client";

const PAGE_SIZE = 5000;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


// [id, date, symbol, yearHigh, yearLow, previousClose, open, last, close, change, bid, ask, volume, value]
const toStockPrice = (row: string[]): IStockPrice | null => {
  const date = toDate(row[1]);
  const symbol = toSymbol(row[2]);
  if (!date || !symbol) return null;
  const previousClose = toNumber(row[5]);
  const change = toNumber(row[9]);
  return {
    symbol,
    date,
    yearHigh: toNumber(row[3]),
    yearLow: toNumber(row[4]),
    previousClose,
    open: toNumber(row[6]),
    last: toNumber(row[7]),
    close: toNumber(row[8]),
    change,
    changePercent: previousClose && change !== null ? round((change / previousClose) * 100) : null,
    bid: toNumber(row[10]),
    ask: toNumber(row[11]),
    volume: toNumber(row[12]),
    value: toNumber(row[13]),
  };
};

// [id, day, date, volume, gseCI, marketCap, gseFSI]
const toMarketSummary = (row: string[]): IMarketSummary | null => {
  const date = toDate(row[2]);
  if (!date) return null;
  return {
    date,
    volume: toNumber(row[3]),
    gseCI: toNumber(row[4]),
    marketCap: toNumber(row[5]),
    gseFSI: toNumber(row[6]),
  };
};

// [id, symbol, company, dateListed, ...]
const toStock = (board: Board) => (row: string[]): IStock | null => {
  const symbol = toSymbol(row[1]);
  if (!symbol) return null;
  return { symbol, name: cleanText(row[2]), board, listedDate: toDate(row[3]) };
};

const isPresent = <T>(value: T | null): value is T => value !== null;

const savePrices = (rows: IStockPrice[]) =>
  StockPrice.bulkWrite(
    rows.map((row) => ({
      updateOne: { filter: { symbol: row.symbol, date: row.date }, update: { $set: row }, upsert: true },
    })),
    { ordered: false }
  );

const saveSummaries = (rows: IMarketSummary[]) =>
  MarketSummary.bulkWrite(
    rows.map((row) => ({
      updateOne: { filter: { date: row.date }, update: { $set: row }, upsert: true },
    })),
    { ordered: false }
  );

const syncStocks = async () => {
  const boards: [typeof GSE_TABLES.mainBoard, Board][] = [
    [GSE_TABLES.mainBoard, "Main"],
    [GSE_TABLES.etfs, "ETF"],
    [GSE_TABLES.gax, "GAX"],
  ];
  const stocks: IStock[] = [];
  for (const [table, board] of boards) {
    const { rows } = await fetchTable(table, 0, 500);
    stocks.push(...rows.map(toStock(board)).filter(isPresent));
  }
  if (stocks.length) {
    await Stock.bulkWrite(
      stocks.map((s) => ({ updateOne: { filter: { symbol: s.symbol }, update: { $set: s }, upsert: true } }))
    );
  }
  return stocks.length;
};

// Daily mode fetches the newest ~3 weeks so a missed day catches up.
// Full mode pages through all history (one-off backfill).
export const syncGse = async ({ full = false, log = console.log } = {}) => {
  const stocks = await syncStocks();

  // Rows arrive newest-added first; when a stock has two rows for one day, keep the newest
  const seen = new Set<string>();
  const isFirst = (row: IStockPrice) => {
    const key = `${row.symbol}|${row.date.getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  let prices = 0;
  for (let start = 0; ; start += PAGE_SIZE) {
    const { rows, total } = await fetchTable(GSE_TABLES.stockPrices, start, full ? PAGE_SIZE : 1000);
    const parsed = rows.map(toStockPrice).filter(isPresent).filter(isFirst);
    if (parsed.length) await savePrices(parsed);
    prices += parsed.length;
    if (!full || rows.length === 0 || start + PAGE_SIZE >= total) break;
    log(`  stock prices: ${prices.toLocaleString()} / ${total.toLocaleString()}`);
    await pause(500);
  }

  const { rows } = await fetchTable(GSE_TABLES.marketSummary, 0, full ? PAGE_SIZE : 30);
  const days = new Set<number>();
  const summaries = rows
    .map(toMarketSummary)
    .filter(isPresent)
    .filter((row) => !days.has(row.date.getTime()) && days.add(row.date.getTime()));
  if (summaries.length) await saveSummaries(summaries);

  return { stocks, prices, summaries: summaries.length };
};
