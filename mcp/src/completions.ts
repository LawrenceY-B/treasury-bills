import type { ApiService } from "./service/api.js";

const TTL_MS = 60 * 60 * 1000;

// Suggests stock symbols as the user types. The list is cached for an hour so
// each keystroke doesn't hit the API (and wait on Render's cold start).
export const symbolCompleter = (api: ApiService) => {
    let cache: { symbols: string[]; at: number } | null = null;

    return async (value: string) => {
        if (!cache || Date.now() - cache.at > TTL_MS) {
            try {
                const { data } = await api.getStocks();
                cache = { symbols: data.map((s) => s.symbol), at: Date.now() };
            } catch {
                return []; // no suggestions is better than a failed completion
            }
        }
        // return every match: the SDK caps the list at 100 and fills in total/hasMore from it
        const prefix = (value ?? "").toUpperCase();
        return cache.symbols.filter((s) => s.startsWith(prefix));
    };
};
