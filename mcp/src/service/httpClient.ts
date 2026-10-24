import type { ApiResponse, ApiSuccess } from "./types.js";

const TIMEOUT_MS = 90_000; 

export class HttpClient {
    private baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    async get<TData, TMeta = undefined>(endpoint: string, queryParams: Record<string, unknown> = {}): Promise<ApiSuccess<TData, TMeta>> {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams)) {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        }
        const queryString = params.toString();
        const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

        let response: Response;
        try {
            response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        } catch (error) {
            if (error instanceof DOMException && error.name === "TimeoutError") {
                throw new Error(`The API didn't respond within ${TIMEOUT_MS / 1000}s (it may be waking up on Render). Try again.`);
            }
            throw new Error(`Could not reach the API at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
        }

        let json: ApiResponse<TData, TMeta>;
        try {
            json = await response.json() as ApiResponse<TData, TMeta>;
        } catch {
            throw new Error(`The API returned a non-JSON response (HTTP ${response.status})`);
        }

        if (!json.success) {
            throw new Error(json.message || `API request failed with HTTP ${response.status}`);
        }
        return json;
    }
}
