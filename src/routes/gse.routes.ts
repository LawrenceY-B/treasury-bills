import { Router } from "express";
import {
  getInsights,
  getMarket,
  getMarketHistory,
  getStock,
  getStockHistory,
  getStocks,
} from "../controllers/gse.controller";

const gseRoutes = Router();
gseRoutes.get("/stocks", getStocks);
gseRoutes.get("/stocks/:symbol", getStock);
gseRoutes.get("/stocks/:symbol/history", getStockHistory);
gseRoutes.get("/market", getMarket);
gseRoutes.get("/market/history", getMarketHistory);
gseRoutes.get("/insights", getInsights);

export default gseRoutes;
