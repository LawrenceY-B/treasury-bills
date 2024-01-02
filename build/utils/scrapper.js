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
exports.TBillScrapper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
class TBillScrapper {
    constructor() {
        this.Day = [];
        this.securityType = [];
        this.interestRate = [];
        this.discountRate = [];
        this.initiateScrapping = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const browser = yield puppeteer_1.default.launch({
                    headless: "new",
                    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
                });
                const page = yield browser.newPage();
                //   await page.setViewport({ width: 1080, height: 1024 });
                yield page.goto("https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/");
                yield page.waitForSelector("#table_1");
                const t_BillTable = yield page.$$("#table_1");
                for (const table of t_BillTable) {
                    const data = yield table.$$("tbody > tr");
                    for (const td of data) {
                        const days = yield td.$$("td:nth-child(1)");
                        const Type = yield td.$$("td:nth-child(3)");
                        const d_Rate = yield td.$$("td:nth-child(4)");
                        const i_Rate = yield td.$$("td:nth-child(5)");
                        for (const day of days) {
                            const value = yield day.evaluate((node) => node.innerText);
                            this.Day.push(value);
                        }
                        for (const type of Type) {
                            const value = yield type.evaluate((node) => node.innerText);
                            this.securityType.push(value);
                        }
                        for (const rate of d_Rate) {
                            const value = yield rate.evaluate((node) => node.innerText);
                            this.discountRate.push(value);
                        }
                        for (const rate of i_Rate) {
                            const value = yield rate.evaluate((node) => node.innerText);
                            this.interestRate.push(value);
                        }
                    }
                }
                yield browser.close();
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    getTBill() {
        return __awaiter(this, void 0, void 0, function* () {
            const tBill = [];
            const loadingInterval = setInterval(() => {
                process.stdout.write(`${this.getRandomEmoji()} \t`);
            }, 500);
            try {
                yield this.initiateScrapping();
                for (let item = 0; item < this.Day.length; item++) {
                    tBill[item] = {
                        days: this.Day[item],
                        securityType: this.securityType[item],
                        discountRate: this.discountRate[item],
                        interestRate: this.interestRate[item],
                    };
                }
                return tBill;
            }
            catch (error) {
            }
            finally {
                clearInterval(loadingInterval);
                console.log(`\n${this.getRandomEmoji()}  Done!`);
            }
        });
    }
    getRandomEmoji() {
        const emojis = [
            "😊",
            "🚀",
            "🌟",
            "🎉",
            "🥷🏾",
            "🔦",
            "🍕",
            "💯",
            "🎈",
            "🌺",
            "✅",
            "📝",
            "🧟‍♂️",
            "🤩",
            "🫀",
            "🍾",
            "🥂",
            "🏃🏽‍♂️",
            "👑",
            "🔥",
        ];
        const randomIndex = Math.floor(Math.random() * emojis.length);
        return emojis[randomIndex];
    }
}
exports.TBillScrapper = TBillScrapper;
