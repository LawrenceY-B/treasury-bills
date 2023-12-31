import {Router} from "express"
import {getTBill} from "../controllers/tbill.controller"

const tBillRoutes = Router()
tBillRoutes.get('/get-tbill', getTBill)

export default tBillRoutes