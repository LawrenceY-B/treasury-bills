import { NextFunction, Request, Response } from "express";
import { TBillScrapper } from "../utils/scrapper";
import TBillData from "../models/rate.model";

export const getTBill = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await TBillData.find({});
    console.log('ip: '+req.ip)

    if (!data)
      res.status(404).json({ success: false, message: "No data found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
export const getTBillDays = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days } = req.query;
    if (days !== "91" && days !== "182" && days !== "364")
      res
        .status(400)
        .json({ success: false, message: "Invalid query parameter" });
    const query = `${days} DAY BILL`;
    const data = await TBillData.find({ securityType: query });
    if (!data)
      res.status(404).json({ success: false, message: "No data found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
