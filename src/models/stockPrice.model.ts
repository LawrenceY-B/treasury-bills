import { Schema, model } from "mongoose";
import { IStockPrice } from "../interfaces/gse.interface";

const StockPriceSchema = new Schema<IStockPrice>(
  {
    symbol: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    open: Number,
    close: Number,
    last: Number,
    previousClose: Number,
    change: Number,
    changePercent: Number,
    yearHigh: Number,
    yearLow: Number,
    bid: Number,
    ask: Number,
    volume: Number,
    value: Number,
  },
  { timestamps: true }
);

// one row per stock per trading day
StockPriceSchema.index({ symbol: 1, date: 1 }, { unique: true });

const StockPrice = model<IStockPrice>("GseStockPrice", StockPriceSchema);

export default StockPrice;
