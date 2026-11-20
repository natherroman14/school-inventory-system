import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import { createUserRules, updateUserRules, statusRules, resetPasswordRules } from '../utils/validators.js'
import {
  listUsers, createUser, updateUser, setUserStatus, resetUserPassword, getDepartments,
} from '../controllers/userController.js'

const router = Router()
router.use(protect, requireAdmin)

router.get('/', listUsers)
router.get('/departments', getDepartments)
router.post('/', createUserRules, handleValidation, createUser)
router.put('/:id', updateUserRules, handleValidation, updateUser)
router.patch('/:id/status', statusRules, handleValidation, setUserStatus)
router.patch('/:id/password', resetPasswordRules, handleValidation, resetUserPassword)

export default router
