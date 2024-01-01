import cron from "node-cron";
import TBillData from "../models/rate.model";
import { TBillScrapper } from "./scrapper";

export const UpdateDB = async () => {
  try {
    const scrpt = cron.schedule("0 0 */7 * *", async () => {
      console.log("Cron job scheduled");
      const crawler = new TBillScrapper();
      const data = await crawler.getTBill();
      data?.map(async (row) => {
        const newData = new TBillData(row);
        await newData.save();
      });
    });
  } catch (error) {
    console.error(error);
  }
};
