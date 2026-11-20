import { Router } from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import { inventoryCreateRules, inventoryUpdateRules, mongoIdRule } from '../utils/validators.js'
import {
  listInventory, getInventoryItem, createInventoryItem, updateInventoryItem,
  archiveInventoryItem, getInventoryOptions, checkItemCode,
} from '../controllers/inventoryController.js'

const router = Router()
router.use(protect)

router.get('/', listInventory)
router.get('/options', getInventoryOptions)
router.get('/check-code', checkItemCode)
router.get('/:id', mongoIdRule('id'), handleValidation, getInventoryItem)
router.post('/', requireAdmin, inventoryCreateRules, handleValidation, createInventoryItem)
router.put('/:id', requireAdmin, inventoryUpdateRules, handleValidation, updateInventoryItem)
router.delete('/:id', requireAdmin, mongoIdRule('id'), handleValidation, archiveInventoryItem)

export default router
