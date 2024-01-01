import {Router} from "express"
import {getTBill, getTBillDays} from "../controllers/tbill.controller"

const tBillRoutes = Router()
tBillRoutes.get('/get-all-tbill', getTBill)
tBillRoutes.get('/get-tbill', getTBillDays)

export default tBillRoutes