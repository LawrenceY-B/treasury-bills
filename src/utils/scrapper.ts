import puppeteer from "puppeteer";
import { IRates } from "../interfaces/rates.interface";

export class TBillScrapper {
  private Day: string[] = [];
  private securityType: string[] = [];
  private interestRate: string[] = [];
  private discountRate: string[] = [];
  constructor() {}

  protected initiateScrapping = async () => {
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1024 });
      await page.goto(
        "https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/"
      );
      await page.waitForSelector("#table_1");
      const t_BillTable = await page.$$("#table_1");

      for (const table of t_BillTable) {
        const data = await table.$$("tbody > tr");
        for (const td of data) {
          const days = await td.$$("td:nth-child(1)");
          const Type = await td.$$("td:nth-child(3)");
          const d_Rate = await td.$$("td:nth-child(4)");
          const i_Rate = await td.$$("td:nth-child(5)");
          for (const day of days) {
            const value = await day.evaluate((node) => node.innerText);
            this.Day.push(value);
          }
          for (const type of Type) {
            const value = await type.evaluate((node) => node.innerText);
            this.securityType.push(value);
          }
          for (const rate of d_Rate) {
            const value = await rate.evaluate((node) => node.innerText);
            this.discountRate.push(value);
          }
          for (const rate of i_Rate) {
            const value = await rate.evaluate((node) => node.innerText);
            this.interestRate.push(value);
          }
        }
      }
      await browser.close();
    } catch (error) {
      console.error(error);
    }
  };
  public async getTBill() {
    const tBill: IRates[] = [];
    const loadingInterval = setInterval(() => {
      process.stdout.write(`${this.getRandomEmoji()} \t`); // Print a dot as a loading indicator
    }, 500);
    try {
      await this.initiateScrapping();
      for (let item = 0; item < this.Day.length; item++) {
        tBill[item] = {
          days: this.Day[item],
          securityType: this.securityType[item],
          discountRate: this.discountRate[item],
          interestRate: this.interestRate[item],
        };
      }
      
     
      return tBill;
    } catch (error) {
    } finally {
      clearInterval(loadingInterval);
      console.log(`\n${this.getRandomEmoji()}  Done!`);
    }
  }
  private getRandomEmoji() {
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
