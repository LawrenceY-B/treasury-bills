import {
    CLIENT_CAPABILITIES_META_KEY,
    inputRequired,
    inputResponse,
    type InputRequiredResult,
    type McpServer,
    type ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";

export type Display = "chart" | "table" | "text";
const DISPLAYS = ["chart", "table", "text"] as const;
const DEFAULT: Display = "chart";
const KEY = "display";

const displaySchema = z.object({
    display: z.enum(DISPLAYS).default(DEFAULT).meta({ title: "Show as" }),
});

const MESSAGE = "How would you like this shown? A chart is the default; a table or text only uses fewer tokens.";

const isDisplay = (value: unknown): value is Display => DISPLAYS.includes(value as Display);

// 2025-era clients declare capabilities at initialize; 2026-era clients send them with each request
const supportsForms = (server: McpServer, ctx: ServerContext) => {
    const envelope = ctx.mcpReq.envelope as Record<string, { elicitation?: unknown } | undefined> | undefined;
    const caps = server.server.getClientCapabilities() ?? envelope?.[CLIENT_CAPABILITIES_META_KEY];
    return Boolean(caps?.elicitation);
};

/**
 * Asks the user how to show a result (v2 multi-round-trip input).
 * First call: returns an input-required result; the client shows the form and calls the tool again,
 * and the SDK's legacy shim does the same for 2025-era clients.
 * Retry: returns the choice. Falls back to a chart when forms aren't supported or the user declines.
 */
export const askDisplay = (server: McpServer, ctx: ServerContext): Display | InputRequiredResult => {
    const answer = inputResponse(ctx.mcpReq.inputResponses, KEY);
    if (answer.kind === "elicit") {
        const choice = answer.action === "accept" ? answer.content?.[KEY] : undefined;
        return isDisplay(choice) ? choice : DEFAULT;
    }
    if (answer.kind !== "missing" || !supportsForms(server, ctx)) return DEFAULT;

    return inputRequired({
        inputRequests: { [KEY]: inputRequired.elicit({ message: MESSAGE, requestedSchema: displaySchema }) },
    });
};

export const isInputRequired = (value: Display | InputRequiredResult): value is InputRequiredResult =>
    typeof value !== "string";

// The handler runs again after the user answers. Keeping the first round's fetch lets the data
// load while the question is on screen, and the retry picks up the same request instead of refetching.
const REUSE_MS = 2 * 60 * 1000;
const inflight = new Map<string, { promise: Promise<unknown>; at: number }>();

export const fetchOnce = <T>(key: string, fetch: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    for (const [k, v] of inflight) if (now - v.at > REUSE_MS) inflight.delete(k);

    const hit = inflight.get(key);
    if (hit) return hit.promise as Promise<T>;
    const promise = fetch();
    promise.catch(() => {}); // the error surfaces when the handler awaits it
    inflight.set(key, { promise, at: now });
    return promise;
};

export const forget = (key: string) => inflight.delete(key);
