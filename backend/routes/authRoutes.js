import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { loginRules, passwordChangeRules } from '../utils/validators.js'
import { login, logout, me, changePassword } from '../controllers/authController.js'

const router = Router()

router.post('/login', authLimiter, loginRules, handleValidation, login)
router.post('/logout', protect, logout)
router.get('/me', protect, me)
router.patch('/password', protect, passwordChangeRules, handleValidation, changePassword)

export default router
