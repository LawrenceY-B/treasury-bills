import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiService, Tenor } from "../service/api.js";
import { json } from "./format.js";

export const BOG_TBILL_URL = "https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/";

export const registerTBillTools =(server: McpServer, api: ApiService) => {
    server.registerTool("get_tbill_rates", {
        title: "Get Treasury Bill Rates",
        description:
            "Ghana Treasury bill rates from the Bank of Ghana's weekly auctions (91-, 182- and 364-day bills), newest first. " +
            "Each row has the issue date, the tenor in days, the discount rate and the interest rate (annualised yield, the one to quote as the return). " +
            "Only recent auctions are kept (roughly the last month). For rates further back, use a web search or browsing tool if you have one: " +
            `the Bank of Ghana publishes the full history at ${BOG_TBILL_URL}. Otherwise say that today's rate is only an approximation for longer periods. ` +
            "Use for questions about current T-bill rates, how they've moved over recent weeks, or comparing them with stock returns.",
        inputSchema: z.object({
            tenor: z.enum(["91", "182", "364"]).optional().describe("Bill length in days. Leave out to get all three"),
        }),
        annotations: { readOnlyHint: true },
    }, async ({ tenor }) => {
        const rows = await api.getTBillRatesByDays(tenor ? (Number(tenor) as Tenor) : undefined);
        const rates = rows
            .map((r) => ({
                issueDate: r.days,
                tenorDays: parseInt(r.securityType),
                discountRate: Number(r.discountRate),
                interestRate: Number(r.interestRate),
            }))
            .sort((a, b) => Date.parse(`${b.issueDate} UTC`) - Date.parse(`${a.issueDate} UTC`) || a.tenorDays - b.tenorDays);
        return json(rates);
    });
};
