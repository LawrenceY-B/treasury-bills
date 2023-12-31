import { NextFunction, Request, Response } from "express";
import { TBillScrapper } from "../utils/scrapper";

export const getTBill = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const crawler = new TBillScrapper();
    const data = await crawler.getTBill();
    res.status(200).json({ success: true,  data });
  } catch (error) {
    next(error);
  }
};
