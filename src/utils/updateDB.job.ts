import cron from "node-cron";
import TBillData from "../models/rate.model";
import { TBillScrapper } from "./scrapper";

export const UpdateDB = async () => {
  try {
    const script = cron.schedule("0 0 */7 * *", async () => {
      console.log("Cron job scheduled");
      const crawler = new TBillScrapper();
      const data = await crawler.getTBill();
      for (let i = 0; i < data!.length; i++) {
        const newData = new TBillData(data![i]);
        await newData.save();
      }
    });
  } catch (error) {
    console.error(error);
  }
};
