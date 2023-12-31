import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { createServer  } from "http";
import { TBillScrapper } from "./utils/scrapper";

const crawler = new TBillScrapper();

const data=crawler.getTBill()
const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080
app.use(express.json());

const httpserver = server.listen(port, async () => {
    console.log(`🚀🚀🚀Server is running on port ${process.env.PORT}`);
  });