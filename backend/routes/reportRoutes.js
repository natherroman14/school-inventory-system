import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import {
  inventoryReport, transactionsReport, consumptionReport, requestsReport, reportMetadata,
} from '../controllers/reportController.js'

const router = Router()
router.use(protect, requireAdmin)

router.get('/inventory', inventoryReport)
router.get('/transactions', transactionsReport)
router.get('/consumption', consumptionReport)
router.get('/requests', requestsReport)
router.get('/metadata', reportMetadata)

export default router
