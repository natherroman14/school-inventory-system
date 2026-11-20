import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import { listAuditLogs } from '../controllers/auditController.js'

const router = Router()
router.use(protect, requireAdmin)

router.get('/', listAuditLogs)

export default router
