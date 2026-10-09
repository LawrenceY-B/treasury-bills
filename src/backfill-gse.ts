import dotenv from "dotenv";
dotenv.config({ quiet: true });
import mongoose from "mongoose";
import MarketSummary from "./models/marketSummary.model";
import Stock from "./models/stock.model";
import StockPrice from "./models/stockPrice.model";
import { syncGse } from "./utils/gse.sync";

// One-off import of all Ghana Stock Exchange history (npm run gse:backfill)
const run = async () => {
  await mongoose.connect(`${process.env.DB_URL}`);
  await Promise.all([Stock.syncIndexes(), StockPrice.syncIndexes(), MarketSummary.syncIndexes()]);
  const result = await syncGse({ full: true });
  console.log("Fetched:", result);
  console.log("In the database:", {
    stocks: await Stock.countDocuments(),
    prices: await StockPrice.countDocuments(),
    summaries: await MarketSummary.countDocuments(),
  });
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
