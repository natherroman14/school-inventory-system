import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { mongoIdRule } from '../utils/validators.js'
import { handleValidation } from '../middleware/validate.js'
import { listNotifications, unreadCount, markRead, markAllRead } from '../controllers/notificationController.js'

const router = Router()
router.use(protect)

router.get('/', listNotifications)
router.get('/unread-count', unreadCount)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', mongoIdRule('id'), handleValidation, markRead)

export default router
