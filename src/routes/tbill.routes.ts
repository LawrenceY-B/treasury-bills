import {Router} from "express"
import {getTBill, getTBillDays} from "../controllers/tbill.controller"
import {cache} from "../middleware/cache"

const tBillRoutes = Router()
tBillRoutes.get('/get-all-tbill', cache(), getTBill)
tBillRoutes.get('/get-tbill', cache(), getTBillDays)


export default tBillRoutes
