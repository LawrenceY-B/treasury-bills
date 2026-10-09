import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { existsSync, writeFileSync } from "fs";
import mongoose from "mongoose";
import TBillData from "./models/rate.model";
import MarketSummary from "./models/marketSummary.model";
import Stock from "./models/stock.model";
import StockPrice from "./models/stockPrice.model";
import { IRates } from "./interfaces/rates.interface";
import { UpdateDB } from "./utils/updateDB.job";
import { syncGse } from "./utils/gse.sync";
import { buildInsights } from "./utils/gse.insights";
import { cacheEnabled, clearCache } from "./utils/cache";

// The page lists the newest auction first, so the first row per bill type is the latest
const latestRates = (rows: IRates[]) =>
  rows.filter(
    (row, i) => rows.findIndex((r) => r.securityType === row.securityType) === i
  );

const tBillHtml = (rows: IRates[], total: number) => `
<h2>💰 Latest T-bill rates</h2>
<table border="1" cellpadding="6" cellspacing="0">
  <tr><th>Auction date</th><th>Bill</th><th>Discount rate</th><th>Interest rate</th></tr>
  ${latestRates(rows)
    .map(
      (r) =>
        `<tr><td>${r.days}</td><td>${r.securityType}</td><td>${r.discountRate}%</td><td>${r.interestRate}%</td></tr>`
    )
    .join("\n  ")}
</table>
<p>Scraped ${rows.length} rows · ${total} rows in the database.</p>`;

const signed = (n: number | null) => (n === null ? "n/a" : `${n > 0 ? "+" : ""}${n}%`);

const gseHtml = async (synced: { prices: number; summaries: number }) => {
  const insights = await buildInsights("1d");
  const { market } = insights;
  const movers = (rows: { symbol: string; to: number; changePercent: number }[]) =>
    rows.slice(0, 3).map((m) => `<li>${m.symbol}: GH¢${m.to.toFixed(2)} (${signed(m.changePercent)})</li>`).join("") || "<li>None</li>";
  return `
<h2>📈 Ghana Stock Exchange (${insights.to})</h2>
<table border="1" cellpadding="6" cellspacing="0">
  <tr><th>Index</th><th>Value</th><th>Day change</th></tr>
  <tr><td>GSE Composite Index</td><td>${market.gseCI.value}</td><td>${signed(market.gseCI.changePercent)}</td></tr>
  <tr><td>GSE Financial Stock Index</td><td>${market.gseFSI.value}</td><td>${signed(market.gseFSI.changePercent)}</td></tr>
</table>
<p><b>Top gainers</b></p><ul>${movers(insights.topGainers)}</ul>
<p><b>Top losers</b></p><ul>${movers(insights.topLosers)}</ul>
${insights.mostTraded[0] ? `<p><b>Most traded:</b> ${insights.mostTraded[0].symbol} (GH¢${insights.mostTraded[0].value.toLocaleString("en-GB")})</p>` : ""}
<ul>${insights.summary.map((s) => `<li>${s}</li>`).join("")}</ul>
<p>Synced ${synced.prices} price rows and ${synced.summaries} market summaries.</p>`;
};

// GitHub Actions sets these, so failure emails can link to the run's logs
const logsLink = () =>
  process.env.GITHUB_RUN_ID
    ? `<p><a href="${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}">View the logs</a></p>`
    : "";

// Each job runs independently so one failing doesn't block the other
const runJob = async (name: string, job: () => Promise<string>) => {
  try {
    return { ok: true, html: await job() };
  } catch (error) {
    console.error(`${name} failed:`, error);
    return { ok: false, html: `<h2>❌ ${name} failed</h2><pre>${String(error)}</pre>${logsLink()}` };
  }
};

const run = async () => {
  await mongoose.connect(`${process.env.DB_URL}`);
  await Promise.all([TBillData, Stock, StockPrice, MarketSummary].map((m) => m.syncIndexes()));

  const results = [
    await runJob("T-bill scrape", async () => {
      const rows = await UpdateDB();
      const total = await TBillData.countDocuments();
      console.log(`T-bills: scraped ${rows.length} rows, ${total} rows in the database`);
      if (rows.length === 0) throw new Error("Scraper returned no rows");
      return tBillHtml(rows, total);
    }),
    await runJob("GSE sync", async () => {
      const synced = await syncGse();
      console.log("GSE:", synced);
      if (synced.prices === 0) throw new Error("GSE returned no price rows");
      return gseHtml(synced);
    }),
  ];

  if (process.env.SUMMARY_FILE) writeFileSync(process.env.SUMMARY_FILE, results.map((r) => r.html).join("\n<hr>\n"));
  // new data is in, so drop cached API responses; a failure here must not fail the scrape
  try {
    if (cacheEnabled()) console.log(`Cache cleared: ${await clearCache()} keys`);
  } catch (error) {
    console.error("Could not clear the cache:", String(error));
  }
  if (results.some((r) => !r.ok)) throw new Error("One or more jobs failed");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
    // e.g. the database connection failed before any job ran
    if (process.env.SUMMARY_FILE && !existsSync(process.env.SUMMARY_FILE))
      writeFileSync(process.env.SUMMARY_FILE, `<h2>❌ Scrape failed</h2><pre>${String(error)}</pre>${logsLink()}`);
  })
  .finally(() => mongoose.disconnect());
