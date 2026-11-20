export const ROLES = Object.freeze({
  CUSTODIAN: 'CUSTODIAN',
  SUPPLY_OFFICER: 'SUPPLY_OFFICER',
  DEAN: 'DEAN',
  PROGRAM_HEAD: 'PROGRAM_HEAD',
})

export const ADMIN_ROLES = Object.freeze([ROLES.CUSTODIAN, ROLES.SUPPLY_OFFICER])
export const REQUESTER_ROLES = Object.freeze([ROLES.DEAN, ROLES.PROGRAM_HEAD])
export const ALL_ROLES = Object.freeze([...ADMIN_ROLES, ...REQUESTER_ROLES])

export const ROLE_LABELS = Object.freeze({
  [ROLES.CUSTODIAN]: 'Property Custodian',
  [ROLES.SUPPLY_OFFICER]: 'Supply Officer',
  [ROLES.DEAN]: 'Dean',
  [ROLES.PROGRAM_HEAD]: 'Program Head',
})

export const CATEGORIES = Object.freeze([
  'Classroom Supplies',
  'Office Stationery',
  'Laboratory Supplies',
  'Cleaning Supplies',
  'Other',
])

export const UNITS = Object.freeze([
  'piece',
  'box',
  'ream',
  'pack',
  'bottle',
  'set',
  'roll',
  'book',
  'carton',
])

export const REQUEST_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'])
export const TRANSACTION_TYPES = Object.freeze(['STOCK_IN', 'STOCK_OUT'])

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'USER_LOGIN',
  LOGOUT: 'USER_LOGOUT',
  ITEM_CREATED: 'INVENTORY_ITEM_CREATED',
  ITEM_UPDATED: 'INVENTORY_ITEM_UPDATED',
  ITEM_ARCHIVED: 'INVENTORY_ITEM_ARCHIVED',
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  REQUEST_SUBMITTED: 'SUPPLY_REQUEST_SUBMITTED',
  REQUEST_APPROVED: 'SUPPLY_REQUEST_APPROVED',
  REQUEST_REJECTED: 'SUPPLY_REQUEST_REJECTED',
  REQUEST_FULFILLED: 'SUPPLY_REQUEST_FULFILLED',
  USER_CREATED: 'USER_ACCOUNT_CREATED',
  USER_UPDATED: 'USER_ACCOUNT_UPDATED',
  USER_DEACTIVATED: 'USER_ACCOUNT_DEACTIVATED',
  PASSWORD_RESET: 'USER_PASSWORD_RESET',
})

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role)
}

export function stockStatus(quantity, reorderLevel) {
  if (Number(quantity) <= 0) return 'OUT OF STOCK'
  if (Number(quantity) <= Number(reorderLevel)) return 'LOW STOCK'
  return 'IN STOCK'
}
