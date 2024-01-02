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
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const http_1 = require("http");
const ErrorHandler_1 = __importDefault(require("./middleware/ErrorHandler"));
const tbill_routes_1 = __importDefault(require("./routes/tbill.routes"));
const db_1 = require("./database/db");
const updateDB_job_1 = require("./utils/updateDB.job");
const express_rate_limit_1 = require("express-rate-limit");
const request_ip_1 = require("request-ip");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const port = process.env.PORT || 8080;
const IP = process.env.IP_ADDRESS;
const allowlist = [`${IP}`];
//comment this in development
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 12 * 60 * 60 * 1000,
    limit: 8,
    message: "Too many requests from this IP😅, please try again after 12 hours😔. max request limit = 8",
    skip: (req, res) => {
        let userIP = (0, request_ip_1.getClientIp)(req);
        console.log(userIP);
        return allowlist.includes(userIP);
    },
    skipFailedRequests: true,
});
app.use(limiter);
app
    .use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
})
    .use(express_1.default.json())
    .use("/api", tbill_routes_1.default);
app.use(ErrorHandler_1.default);
app.all("*", (req, res) => {
    res.status(404).json({ message: "Page Not Found 😔" });
    console.log("Page Not Found 😔");
});
(0, updateDB_job_1.UpdateDB)();
const httpserver = server.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, db_1.DB_Connection)();
    console.log(`🚀🚀🚀Server is running on port ${process.env.PORT}`);
}));
