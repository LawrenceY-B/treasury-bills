import { Schema, model } from "mongoose";
import { IStock } from "../interfaces/gse.interface";

const StockSchema = new Schema<IStock>(
  {
    symbol: { type: String, required: true, unique: true },
    name: { type: String },
    board: { type: String },
    listedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Stock = model<IStock>("GseStock", StockSchema);

export default Stock;
