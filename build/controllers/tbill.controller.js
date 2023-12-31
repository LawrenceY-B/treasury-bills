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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTBill = void 0;
const scrapper_1 = require("../utils/scrapper");
const getTBill = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const crawler = new scrapper_1.TBillScrapper();
        const data = yield crawler.getTBill();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
exports.getTBill = getTBill;
