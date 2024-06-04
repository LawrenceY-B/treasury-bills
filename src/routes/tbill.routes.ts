import {Router} from "express"
import {getTBill, getTBillDays} from "../controllers/tbill.controller"
import multer from "multer";
import { processFile } from "../controllers/expense.controller";

const storage= multer.memoryStorage();
const upload = multer({storage})
const tBillRoutes = Router()
tBillRoutes.get('/get-all-tbill', getTBill)
tBillRoutes.get('/get-tbill', getTBillDays)
tBillRoutes.post('/upload-doc',upload.single('file') ,processFile)


export default tBillRoutes