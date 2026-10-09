import { Schema, model } from "mongoose";
import { IMarketSummary } from "../interfaces/gse.interface";

const MarketSummarySchema = new Schema<IMarketSummary>(
  {
    date: { type: Date, required: true, unique: true },
    gseCI: Number,
    gseFSI: Number,
    marketCap: Number,
    volume: Number,
  },
  { timestamps: true }
);

const MarketSummary = model<IMarketSummary>("GseMarketSummary", MarketSummarySchema);

export default MarketSummary;
