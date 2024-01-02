"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTBillDays = exports.getTBill = void 0;
const rate_model_1 = __importDefault(require("../models/rate.model"));
const getTBill = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield rate_model_1.default.find({});
        console.log('ip: ' + req.ip);
        if (!data)
            res.status(404).json({ success: false, message: "No data found" });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
exports.getTBill = getTBill;
const getTBillDays = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { days } = req.query;
        if (days !== "91" && days !== "182" && days !== "364")
            res
                .status(400)
                .json({ success: false, message: "Invalid query parameter" });
        const query = `${days} DAY BILL`;
        const data = yield rate_model_1.default.find({ securityType: query });
        if (!data)
            res.status(404).json({ success: false, message: "No data found" });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
exports.getTBillDays = getTBillDays;
