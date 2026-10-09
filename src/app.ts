import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
import { createServer } from "http";
import ErrorHandler from "./middleware/ErrorHandler";
import tBillRoutes from "./routes/tbill.routes";
import gseRoutes from "./routes/gse.routes";
import { DB_Connection } from "./database/db";
import { rateLimit } from 'express-rate-limit'
import {getClientIp} from "request-ip"

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080;
const IP= process.env.IP_ADDRESS
const allowlist = [`${IP}`]

app
  .use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET"
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    next();
  })
  .use(express.json())
  .use("/api/gse", gseRoutes)
  .use("/api", tBillRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "💰 Ghana Treasury Bill & Stock Exchange API 💹",
    sources: [
      "https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/",
      "https://gse.com.gh/trading-and-data/",
    ],
    endpoints: {
      treasuryBills: [
        { method: "GET", path: "/api/get-all-tbill", description: "All stored Treasury Bill rates" },
        {
          method: "GET",
          path: "/api/get-tbill?days={91|182|364}",
          description: "Treasury Bill rates for one tenor",
          example: "/api/get-tbill?days=91",
        },
      ],
      stockExchange: [
        { method: "GET", path: "/api/gse/stocks", description: "Every stock that traded on the latest day, with price and change. Add ?all=true for every symbol in the history" },
        { method: "GET", path: "/api/gse/stocks/{symbol}", description: "Company details and latest quote", example: "/api/gse/stocks/MTNGH" },
        {
          method: "GET",
          path: "/api/gse/stocks/{symbol}/history?period={1d|1w|1m|3m|6m|ytd|1y|5y|max}",
          description: "Daily prices for charts, oldest first (default 1y, back to 2007 for older stocks). Use from=YYYY-MM-DD&to=YYYY-MM-DD for exact dates",
          example: "/api/gse/stocks/MTNGH/history?period=6m",
        },
        { method: "GET", path: "/api/gse/market", description: "Latest GSE Composite Index, Financial Stock Index, market cap and volume, with daily change" },
        { method: "GET", path: "/api/gse/market/history?period={1d|1w|1m|3m|6m|ytd|1y|5y|max}", description: "Daily market summaries (default 1y), or from=&to= for exact dates" },
        {
          method: "GET",
          path: "/api/gse/insights?period={1d|1w|1m|3m|6m|ytd|1y|5y}",
          description: "Plain-English market insights: returns, top movers, unusual volume, comparison with T-bills",
          example: "/api/gse/insights?period=1m",
        },
      ],
    },
    docs: "https://github.com/LawrenceY-B/treasury-bills",
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Page Not Found 😔" });
  console.log("Page Not Found 😔");
});
app.use(ErrorHandler);
 server.listen(port, async () => {
    await DB_Connection();
  console.log(`🚀🚀🚀Server is running on port ${process.env.PORT}`);
});
