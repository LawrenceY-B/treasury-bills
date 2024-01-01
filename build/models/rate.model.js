"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const TbillSchema = new mongoose_1.Schema({
    days: { type: String },
    securityType: { type: String },
    discountRate: { type: String },
    interestRate: { type: String },
    createdAt: { type: Date, default: Date.now, index: { expires: '7d' } },
}, { timestamps: true });
const TBillData = (0, mongoose_1.model)("TBillRates", TbillSchema);
exports.default = TBillData;
