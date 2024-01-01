import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { createServer } from "http";
import ErrorHandler from "./middleware/ErrorHandler";
import tBillRoutes from "./routes/tbill.routes";
import { DB_Connection } from "./database/db";
import { UpdateDB } from "./utils/updateDB.job";
import { rateLimit } from 'express-rate-limit'
import {getClientIp} from "request-ip"

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080;
const IP= process.env.IP_ADDRESS
const allowlist = [`${IP}`]

//comment this in development
const limiter = rateLimit({
	windowMs: 12 * 60 * 60 * 1000,
	limit: 8, 
	message: "Too many requests from this IP😅, please try again after 12 hours😔. max request limit = 8",
    skip: (req:Request, res:Response) =>{
        let userIP=getClientIp(req)
        console.log(userIP)
        return allowlist.includes(userIP as string)},
    skipFailedRequests:true,
})
app.use(limiter)
app
  .use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET"
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    next();
  })
  .use(express.json())
  .use("/api", tBillRoutes);
app.use(ErrorHandler);

app.all("*", (req: Request, res: Response) => {
  res.status(404).json({ message: "Page Not Found 😔" });
  console.log("Page Not Found 😔");
});
UpdateDB();
const httpserver = server.listen(port, async () => {
    await DB_Connection();
  console.log(`🚀🚀🚀Server is running on port ${process.env.PORT}`);
});
