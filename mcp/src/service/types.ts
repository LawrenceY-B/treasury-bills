

export interface ApiSuccess<TData, TMeta = undefined> {
    success: true;
    data: TData;
    meta?: TMeta;
}

export interface ApiError {
    success: false;
    message: string;
    status?: number;
}

export type ApiResponse<TData, TMeta = undefined> = ApiSuccess<TData, TMeta> | ApiError;

export type Period = "1d" | "1w" | "1m" | "3m" | "6m" | "ytd" | "1y" | "5y" | "max";
export type Board = "Main" | "ETF" | "GAX";


export interface TBillRate {
    days: string; // issue date, e.g. "28 Sep 2026" (misnamed in the API)
    securityType: "91 DAY BILL" | "182 DAY BILL" | "364 DAY BILL";
    discountRate: string; 
    interestRate: string;
}

// ---- Stocks: /gse/stocks

export interface Stock {
    symbol: string;
    name: string | null;
    board: Board | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
}

export interface StocksMeta {
    date: string;
    count: number;
    currency: "GHS";
}

export interface ListedSymbol {
    symbol: string;
    name: string | null;
    board: Board | null;
    firstDate: string;
    lastDate: string;
    tradingDays: number;
}


export interface StockPrice {
    date: string;
    open: number | null;
    close: number | null; // closing price (VWAP)
    last: number | null; // last trade
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
    bid: number | null;
    ask: number | null;
    volume: number | null;
    value: number | null; // GH¢ traded
    yearHigh: number | null;
    yearLow: number | null;
}

export interface StockDetail {
    symbol: string;
    name: string | null;
    board: Board | null;
    listedDate: string | null;
    quote: StockPrice;
    history: { firstDate: string; lastDate: string; tradingDays: number };
}

export interface RangeChange {
    from: number | null;
    to: number | null;
    changePercent: number | null;
}

export interface StockHistoryMeta {
    symbol: string;
    period: Period | null;
    from: string | null;
    to: string | null;
    count: number;
    change: RangeChange;
    currency: "GHS";
}


export interface Metric {
    value: number | null;
    change: number | null;
    changePercent: number | null;
}

export interface Market {
    date: string;
    previousDate: string | null;
    gseCI: Metric;
    gseFSI: Metric;
    marketCapMillion: Metric; // GH¢ million
    volume: Metric;
}

export type MarketMeta = Record<"gseCI" | "gseFSI" | "marketCapMillion" | "volume", string>;

export interface MarketSummary {
    date: string;
    gseCI: number | null;
    gseFSI: number | null;
    marketCapMillion: number | null;
    volume: number | null;
}

export interface MarketHistoryMeta {
    period: Period | null;
    from: string | null;
    to: string | null;
    count: number;
    change: { gseCI: RangeChange };
}


export interface Mover {
    symbol: string;
    name: string | null;
    from: number;
    to: number;
    changePercent: number;
}

export interface Insights {
    period: Exclude<Period, "max">;
    from: string;
    to: string;
    summary: string[]; 
    market: {
        from: string | null;
        to: string;
        gseCI: { value: number | null; changePercent: number | null };
        gseFSI: { value: number | null; changePercent: number | null };
        marketCapMillion: { value: number | null; change: number | null };
    };
    breadth: { up: number; down: number; unchanged: number };
    topGainers: Mover[];
    topLosers: Mover[];
    mostTraded: { symbol: string; name: string | null; value: number; volume: number }[];
    unusualVolume: { symbol: string; volume: number; averageVolume: number; timesAverage: number }[];
    near52WeekHigh: { symbol: string; close: number | null; yearHigh: number | null }[];
    near52WeekLow: { symbol: string; close: number | null; yearLow: number | null }[];
    tBills: { tenor: string; interestRate: number; equivalentForPeriod: number | null }[]; // null for periods over 1m
}
