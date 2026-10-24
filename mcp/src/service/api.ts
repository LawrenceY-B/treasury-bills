import { ENDPOINTS } from "./endpoints.js";
import { HttpClient } from "./httpClient.js";
import type {
    Insights,
    ListedSymbol,
    Market,
    MarketHistoryMeta,
    MarketSummary,
    Period,
    Stock,
    StockDetail,
    StockHistoryMeta,
    StockPrice,
    StocksMeta,
    TBillRate,
} from "./types.js";

export type Tenor = 91 | 182 | 364;
export type InsightPeriod = Exclude<Period, "max">;

// a period, or an exact from/to range (YYYY-MM-DD); from/to win if both are given
export interface HistoryOptions {
    period?: Period;
    from?: string;
    to?: string;
    limit?: number;
}

export class ApiService {
    private baseUrl: string = process.env.API_BASE_URL || "https://treasury-bills.onrender.com"
    private httpClient: HttpClient;

    constructor() {
        this.httpClient = new HttpClient(this.baseUrl);
    }

    async getAllTBillRates() {
        const res = await this.httpClient.get<TBillRate[]>(ENDPOINTS.allTBills);
        return res.data;
    }

    async getTBillRatesByDays(days?: Tenor) {
        if (!days) {
            return this.getAllTBillRates();
        }
        const res = await this.httpClient.get<TBillRate[]>(ENDPOINTS.tBill, { days });
        return res.data;
    }

    // stocks that traded on the latest day; meta.date says which day
    async getStocks() {
        const res = await this.httpClient.get<Stock[], StocksMeta>(ENDPOINTS.stocks);
        return { data: res.data, meta: res.meta };
    }

    // every symbol ever listed, with its first and last trading day
    async getListedSymbols() {
        const res = await this.httpClient.get<ListedSymbol[]>(ENDPOINTS.stocks, { all: true });
        return res.data;
    }

    async getStock(symbol: string) {
        const res = await this.httpClient.get<StockDetail>(ENDPOINTS.stock(symbol));
        return res.data;
    }

    // rows oldest -> newest; meta.change is the move over the whole range
    async getStockHistory(symbol: string, options: HistoryOptions = {}) {
        const res = await this.httpClient.get<StockPrice[], StockHistoryMeta>(ENDPOINTS.stockHistory(symbol), { ...options });
        return { data: res.data, meta: res.meta };
    }

    async getMarketData() {
        const res = await this.httpClient.get<Market>(ENDPOINTS.market);
        return res.data;
    }

    async getMarketHistory(options: HistoryOptions = {}) {
        const res = await this.httpClient.get<MarketSummary[], MarketHistoryMeta>(ENDPOINTS.marketHistory, { ...options });
        return { data: res.data, meta: res.meta };
    }

    async getInsights(period?: InsightPeriod) {
        const res = await this.httpClient.get<Insights>(ENDPOINTS.insights, { period });
        return res.data;
    }
}
