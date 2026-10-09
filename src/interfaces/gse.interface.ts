export type Board = "Main" | "ETF" | "GAX";

export interface IStock {
  symbol: string;
  name: string;
  board: Board;
  listedDate: Date | null;
}

// One trading day for one stock. Prices are in GH¢.
export interface IStockPrice {
  symbol: string;
  date: Date;
  open: number | null;
  close: number | null; // closing price (VWAP)
  last: number | null; // last transaction price
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  bid: number | null;
  ask: number | null;
  volume: number | null; // shares traded
  value: number | null; // GH¢ traded
}

export interface IMarketSummary {
  date: Date;
  gseCI: number | null; // GSE Composite Index
  gseFSI: number | null; // GSE Financial Stock Index
  marketCap: number | null; // GH¢ million
  volume: number | null;
}
