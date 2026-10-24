import type { ApiService } from "./service/api.js";

const TTL_MS = 60 * 60 * 1000;

// module scope: over HTTP every request builds a new server
let cache: { symbols: string[]; at: number } | null = null;

export const symbolCompleter = (api: ApiService) => {
    return async (value: string) => {
        if (!cache || Date.now() - cache.at > TTL_MS) {
            try {
                const { data } = await api.getStocks();
                cache = { symbols: data.map((s) => s.symbol), at: Date.now() };
            } catch {
                return [];
            }
        }
        const prefix = (value ?? "").toUpperCase();
        return cache.symbols.filter((s) => s.startsWith(prefix));
    };
};
