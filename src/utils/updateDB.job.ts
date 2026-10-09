import TBillData from "../models/rate.model";
import { TBillScrapper } from "./scrapper";

export const UpdateDB = async () => {
  const crawler = new TBillScrapper();
  const data = (await crawler.getTBill()) ?? [];
  if (data.length === 0) return data;

  await TBillData.bulkWrite(
    data.map((row) => ({
      updateOne: {
        filter: { days: row.days, securityType: row.securityType },
        update: {
          $set: { discountRate: row.discountRate, interestRate: row.interestRate },
        },
        upsert: true,
      },
    }))
  );
  return data;
};
