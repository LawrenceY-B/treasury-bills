"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tbill_controller_1 = require("../controllers/tbill.controller");
const tBillRoutes = (0, express_1.Router)();
tBillRoutes.get('/get-tbill', tbill_controller_1.getTBill);
exports.default = tBillRoutes;
