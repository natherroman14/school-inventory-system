import { body, param } from 'express-validator'
import { ALL_ROLES, CATEGORIES, UNITS } from './constants.js'

const passwordRules = body('password')
  .isString().withMessage('Password must be text')
  .isLength({ min: 8, max: 72 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
  .matches(/\d/).withMessage('Password must contain a number')

export const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
]

export const createUserRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 120 }),
  body('username').trim().matches(/^[a-zA-Z0-9._-]{3,40}$/).withMessage('Username must be 3-40 characters (letters, numbers, . _ -)'),
  passwordRules,
  body('role').isIn(ALL_ROLES).withMessage('Select a valid role'),
  body('department').trim().notEmpty().withMessage('Department / College is required'),
]

export const updateUserRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('fullName').optional().trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(ALL_ROLES).withMessage('Select a valid role'),
  body('department').optional().trim().notEmpty().withMessage('Department / College is required'),
]

export const statusRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
]

export const resetPasswordRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('newPassword').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number'),
]

export const inventoryCreateRules = [
  body('itemCode').optional({ checkFalsy: true }).trim().matches(/^[A-Za-z0-9-]{1,30}$/).withMessage('Item code may contain letters, numbers and hyphens only'),
  body('itemName').trim().notEmpty().withMessage('Item name is required').isLength({ max: 150 }),
  body('category').isIn(CATEGORIES).withMessage('Select a valid category'),
  body('unit').isIn(UNITS).withMessage('Select a valid unit'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be zero or more').toInt(),
  body('reorderLevel').isInt({ min: 0 }).withMessage('Reorder level must be zero or more').toInt(),
]

export const inventoryUpdateRules = [
  param('id').isMongoId().withMessage('Invalid item id'),
  ...inventoryCreateRules,
]

export const mongoIdRule = (field = 'id') => param(field).isMongoId().withMessage(`Invalid ${field}`)

export const requestCreateRules = [
  body('items').isArray({ min: 1 }).withMessage('Select at least one item'),
  body('items.*.item').isMongoId().withMessage('Invalid item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt(),
  body('purpose').trim().notEmpty().withMessage('Purpose is required').isLength({ max: 500 }),
  body('dateNeeded').isISO8601().withMessage('Date needed must be a valid date'),
]

export const decisionRules = [
  param('id').isMongoId().withMessage('Invalid request id'),
  body('remarks').optional().trim().isLength({ max: 500 }),
]

export const rejectRules = [
  param('id').isMongoId().withMessage('Invalid request id'),
  body('remarks').trim().notEmpty().withMessage('Remarks are required when rejecting a request'),
]

export const stockInRules = [
  body('itemId').isMongoId().withMessage('Select a valid item'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1').toInt(),
  body('note').optional().trim().isLength({ max: 300 }),
]

export const passwordChangeRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 8, max: 72 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number'),
]
