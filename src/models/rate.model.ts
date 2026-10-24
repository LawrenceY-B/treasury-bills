import { Schema, model } from "mongoose";
import { ITBill } from "../interfaces/rates.interface";

const TbillSchema = new Schema<ITBill>(
  {
    days: { type: String },
    securityType: { type: String },
    discountRate: { type: String },
    interestRate: { type: String },
},
  { timestamps: true }
);

TbillSchema.index({ days: 1, securityType: 1 }, { unique: true });
// every scrape bumps updatedAt, so rows expire 30 days after they drop off the BoG page
TbillSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const TBillData = model<ITBill>("TBillRates", TbillSchema);

export default TBillData;