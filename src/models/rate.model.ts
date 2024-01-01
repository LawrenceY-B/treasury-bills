import { Schema, model } from "mongoose";
import { ITBill } from "../interfaces/rates.interface";

const TbillSchema = new Schema<ITBill>(
  {
    days: { type: String },
    securityType: { type: String },
    discountRate: { type: String },
    interestRate: { type: String },
    createdAt: { type: Date, default: Date.now, index: { expires: 7 * 24 * 60 * 60 * 1000 } },
},
  { timestamps: true }
);

const TBillData = model<ITBill>("TBilldata", TbillSchema);

export default TBillData;