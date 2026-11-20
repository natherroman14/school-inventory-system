import { InventoryItem } from '../models/InventoryItem.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { StockTransaction } from '../models/StockTransaction.js'
import { isAdminRole } from '../utils/constants.js'
import { monthRange } from '../utils/pagination.js'
import { sendSuccess } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const LOW_STOCK_EXPR = {
  $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }],
}

export const getDashboard = asyncHandler(async (req, res) => {
  const admin = isAdminRole(req.user.role)
  const requestFilter = admin ? {} : { requestedBy: req.user.id }
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const [
    totalItems,
    inStock,
    lowStock,
    outOfStock,
    pendingRequests,
    issuedResult,
    recentRequests,
    lowStockItems,
    recentTransactions,
    consumption,
    distribution,
  ] = await Promise.all([
    InventoryItem.countDocuments({ isArchived: false }),
    InventoryItem.countDocuments({ isArchived: false, $expr: { $gt: ['$quantity', '$reorderLevel'] } }),
    InventoryItem.countDocuments({ isArchived: false, $expr: LOW_STOCK_EXPR }),
    InventoryItem.countDocuments({ isArchived: false, quantity: 0 }),
    SupplyRequest.countDocuments({ ...requestFilter, status: 'PENDING' }),
    StockTransaction.aggregate([
      { $match: { transactionType: 'STOCK_OUT', createdAt: monthRange() } },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    ]),
    SupplyRequest.find(requestFilter)
      .populate('requestedBy', 'fullName department')
      .sort({ createdAt: -1 })
      .limit(6),
    InventoryItem.find({ isArchived: false, $expr: LOW_STOCK_EXPR }).sort({ quantity: 1 }).limit(5),
    admin
      ? StockTransaction.find()
        .populate('item', 'itemCode itemName unit')
        .populate('performedBy', 'fullName')
        .sort({ createdAt: -1 })
        .limit(5)
      : Promise.resolve([]),
    StockTransaction.aggregate([
      { $match: { transactionType: 'STOCK_OUT', createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, value: { $sum: '$quantity' } } },
      { $sort: { _id: 1 } },
    ]),
    InventoryItem.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$category', value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
  ])

  const consumptionMap = new Map(consumption.map((row) => [row._id, row.value]))
  const consumptionChart = []
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date()
    month.setDate(1)
    month.setMonth(month.getMonth() - offset)
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    consumptionChart.push({
      label: month.toLocaleString('en-US', { month: 'short' }),
      value: consumptionMap.get(key) || 0,
    })
  }

  sendSuccess(res, {
    roleGroup: admin ? 'ADMIN' : 'REQUESTER',
    stats: {
      totalItems,
      inStock,
      lowStock,
      outOfStock,
      pendingRequests,
      issuedThisMonth: issuedResult[0]?.quantity || 0,
      issuedTransactionsThisMonth: issuedResult[0]?.count || 0,
    },
    recentRequests,
    lowStockItems,
    recentTransactions,
    consumptionChart,
    distributionChart: distribution.map((row) => ({ label: row._id, value: row.value })),
  })
})
