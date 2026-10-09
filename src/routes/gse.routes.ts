import { Router } from "express";
import {
  getInsights,
  getMarket,
  getMarketHistory,
  getStock,
  getStockHistory,
  getStocks,
} from "../controllers/gse.controller";
import { cache } from "../middleware/cache";

const gseRoutes = Router();
gseRoutes.get("/stocks", cache(), getStocks);
gseRoutes.get("/stocks/:symbol", cache(), getStock);
gseRoutes.get("/stocks/:symbol/history", cache(), getStockHistory);
gseRoutes.get("/market", cache(), getMarket);
gseRoutes.get("/market/history", cache(), getMarketHistory);
gseRoutes.get("/insights", cache(), getInsights);

export default gseRoutes;
