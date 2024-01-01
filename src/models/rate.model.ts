import { Schema, model } from "mongoose";
import { ITBill } from "../interfaces/rates.interface";

const TbillSchema = new Schema<ITBill>(
  {
    days: { type: String },
    securityType: { type: String },
    discountRate: { type: String },
    interestRate: { type: String },
    createdAt: { type: Date, default: Date.now, index: { expires: '7d' } },
},
  { timestamps: true }
);

const TBillData = model<ITBill>("TBillRates", TbillSchema);

export default TBillData;