import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { writeFileSync } from "fs";
import mongoose from "mongoose";
import TBillData from "./models/rate.model";
import { IRates } from "./interfaces/rates.interface";
import { UpdateDB } from "./utils/updateDB.job";

// The page lists the newest auction first, so the first row per bill type is the latest
const latestRates = (rows: IRates[]) =>
  rows.filter(
    (row, i) => rows.findIndex((r) => r.securityType === row.securityType) === i
  );

// HTML summary for the scheduled workflow's email step
const summaryHtml = (rows: IRates[], total: number) => `
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

// One-off scrape, run by the scheduled GitHub Actions workflow (npm run scrape)
const run = async () => {
  await mongoose.connect(`${process.env.DB_URL}`);
  await TBillData.syncIndexes();
  const rows = await UpdateDB();
  const total = await TBillData.countDocuments();
  console.log(`Scraped ${rows.length} rows, ${total} rows in the database`);
  if (rows.length === 0) throw new Error("Scraper returned no rows");

  if (process.env.SUMMARY_FILE) {
    writeFileSync(process.env.SUMMARY_FILE, summaryHtml(rows, total));
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
