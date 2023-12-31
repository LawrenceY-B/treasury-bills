import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";
import { createServer } from "http";
import ErrorHandler from "./middleware/ErrorHandler";
import tBillRoutes from "./routes/tbill.routes";

const app = express();
const server = createServer(app);
const port = process.env.PORT || 8080;
app
  .use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE"
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

const httpserver = server.listen(port, async () => {
  console.log(`🚀🚀🚀Server is running on port ${process.env.PORT}`);
});
