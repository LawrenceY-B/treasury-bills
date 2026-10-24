import {
    acceptedContent,
    CLIENT_CAPABILITIES_META_KEY,
    inputRequired,
    type InputRequiredResult,
    type ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";

export type Display = "chart" | "table" | "text";
const DEFAULT: Display = "chart";
const KEY = "display";
const ASK_TIMEOUT_MS = 60_000;

const displaySchema = z.object({
    display: z.enum(["chart", "table", "text"]).describe("How to show the result"),
});

const MESSAGE = "How would you like this shown? A chart is the default; a table or text only uses fewer tokens.";

// The elicitation form as plain JSON Schema, for 2025-era clients
const FORM = {
    type: "object" as const,
    properties: {
        display: {
            type: "string" as const,
            title: "Show as",
            enum: ["chart", "table", "text"],
            enumNames: ["Chart", "Table", "Text only"],
            default: DEFAULT,
        },
    },
    required: [KEY],
};

const isDisplay = (value: unknown): value is Display => value === "chart" || value === "table" || value === "text";

/**
 * Asks the user how to show a result, while the tool is running.
 * Falls back to a chart when the client can't show forms, or the user dismisses or ignores it.
 * On 2026-era clients this returns an input-required result; the tool returns it as is,
 * and the client calls the tool again with the answer.
 */
export const askDisplay = async (ctx: ServerContext): Promise<Display | InputRequiredResult> => {
    // 2026 era, second round: the client retried the call with the user's answer
    if (ctx.mcpReq.inputResponses) {
        const answer = acceptedContent(ctx.mcpReq.inputResponses, KEY, displaySchema);
        return answer?.display ?? DEFAULT;
    }

    // 2026 era, first round: ask through an input-required result, if the client supports forms
    const envelope = ctx.mcpReq.envelope as Record<string, { elicitation?: unknown } | undefined> | undefined;
    if (envelope) {
        if (!envelope[CLIENT_CAPABILITIES_META_KEY]?.elicitation) return DEFAULT;
        return inputRequired({
            inputRequests: { [KEY]: inputRequired.elicit({ message: MESSAGE, requestedSchema: displaySchema }) },
        });
    }

    // 2025 era: ask directly; throws when the client doesn't support forms or the user never answers
    try {
        const result = await ctx.mcpReq.elicitInput(
            { mode: "form", message: MESSAGE, requestedSchema: FORM },
            { timeout: ASK_TIMEOUT_MS },
        );
        const choice = result.action === "accept" ? result.content?.[KEY] : undefined;
        return isDisplay(choice) ? choice : DEFAULT;
    } catch {
        return DEFAULT;
    }
};

export const isInputRequired = (value: Display | InputRequiredResult): value is InputRequiredResult =>
    typeof value !== "string";
