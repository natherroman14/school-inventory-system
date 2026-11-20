import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import { stockInRules } from '../utils/validators.js'
import { listTransactions, stockIn } from '../controllers/transactionController.js'

const router = Router()
router.use(protect)

router.get('/', listTransactions)
router.post('/stock-in', requireAdmin, stockInRules, handleValidation, stockIn)

export default router
