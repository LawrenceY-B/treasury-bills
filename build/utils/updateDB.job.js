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
exports.UpdateDB = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const rate_model_1 = __importDefault(require("../models/rate.model"));
const scrapper_1 = require("./scrapper");
const UpdateDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const script = node_cron_1.default.schedule("0 0 */7 * *", () => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Cron job scheduled");
            const crawler = new scrapper_1.TBillScrapper();
            const data = yield crawler.getTBill();
            for (let i = 0; i < data.length; i++) {
                const newData = new rate_model_1.default(data[i]);
                yield newData.save();
            }
        }));
    }
    catch (error) {
        console.error(error);
    }
});
exports.UpdateDB = UpdateDB;
