import { Schema, model } from "mongoose";
import { ITBill } from "../interfaces/rates.interface";

const TbillSchema = new Schema<ITBill>(
  {
    days: { type: String },
    securityType: { type: String },
    discountRate: { type: String },
    interestRate: { type: String },
    createdAt: { type: Date, default: Date.now, index: { expires: '30d' } },
},
  { timestamps: true }
);

TbillSchema.index({ days: 1, securityType: 1 }, { unique: true });

const TBillData = model<ITBill>("TBillRates", TbillSchema);

export default TBillData;