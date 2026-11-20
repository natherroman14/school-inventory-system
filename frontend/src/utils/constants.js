export const CATEGORIES = [
  'Classroom Supplies',
  'Office Stationery',
  'Laboratory Supplies',
  'Cleaning Supplies',
  'Other',
]

export const UNITS = ['piece', 'box', 'ream', 'pack', 'bottle', 'set', 'roll', 'book', 'carton']

export const ROLES = [
  { value: 'CUSTODIAN', label: 'Property Custodian', group: 'ADMIN' },
  { value: 'SUPPLY_OFFICER', label: 'Supply Officer', group: 'ADMIN' },
  { value: 'DEAN', label: 'Dean', group: 'REQUESTER' },
  { value: 'PROGRAM_HEAD', label: 'Program Head', group: 'REQUESTER' },
]

export const ROLE_LABELS = Object.fromEntries(ROLES.map((role) => [role.value, role.label]))

export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']
export const STOCK_STATUSES = ['IN STOCK', 'LOW STOCK', 'OUT OF STOCK']

export const SYSTEM_NAME = 'ESSU-SALCEDO SCHOOL SUPPLIES INVENTORY MONITORING SYSTEM'
