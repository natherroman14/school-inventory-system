import { Router } from 'express'
import { protect, requireAdmin, requireRequester } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import { requestCreateRules, decisionRules, rejectRules, mongoIdRule } from '../utils/validators.js'
import {
  listRequests, getRequest, createRequest, approveRequest, rejectRequest, fulfillRequest,
} from '../controllers/requestController.js'

const router = Router()
router.use(protect)

router.get('/', listRequests)
router.get('/:id', mongoIdRule('id'), handleValidation, getRequest)
router.post('/', requireRequester, requestCreateRules, handleValidation, createRequest)
router.patch('/:id/approve', requireAdmin, decisionRules, handleValidation, approveRequest)
router.patch('/:id/reject', requireAdmin, rejectRules, handleValidation, rejectRequest)
router.patch('/:id/fulfill', requireAdmin, mongoIdRule('id'), handleValidation, fulfillRequest)

export default router
