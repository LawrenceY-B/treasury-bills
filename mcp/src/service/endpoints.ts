const STOCKS = "/api/gse/stocks";

export const ENDPOINTS = {
    allTBills: "/api/get-all-tbill",
    tBill: "/api/get-tbill",
    stocks: STOCKS,
    stock: (symbol: string) => `${STOCKS}/${encodeURIComponent(symbol)}`,
    stockHistory: (symbol: string) => `${STOCKS}/${encodeURIComponent(symbol)}/history`,
    market: "/api/gse/market",
    marketHistory: "/api/gse/market/history",
    insights: "/api/gse/insights",
} as const;
