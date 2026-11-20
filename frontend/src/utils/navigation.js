export const adminNavigation = [
  { label: 'Overview', items: [
    { title: 'Dashboard', to: '/custodian/dashboard', icon: 'grid' },
  ] },
  { label: 'Inventory Operations', items: [
    { title: 'Inventory Management', to: '/custodian/inventory', icon: 'package' },
    { title: 'Supply Requests', to: '/custodian/requests', icon: 'clipboard', badgeKey: 'pending' },
    { title: 'Stock Transactions', to: '/custodian/transactions', icon: 'arrows' },
    { title: 'Low-Stock Alerts', to: '/custodian/alerts', icon: 'bell', badgeKey: 'alerts' },
  ] },
  { label: 'Administration', items: [
    { title: 'Audit Logs', to: '/custodian/audit-logs', icon: 'shield' },
    { title: 'Reports', to: '/custodian/reports', icon: 'chart' },
    { title: 'User Management', to: '/custodian/users', icon: 'users' },
  ] },
  { label: 'Account', items: [
    { title: 'Profile', to: '/custodian/profile', icon: 'user' },
  ] },
]

export const requesterNavigation = [
  { label: 'Overview', items: [
    { title: 'Dashboard', to: '/dean/dashboard', icon: 'grid' },
  ] },
  { label: 'Supplies', items: [
    { title: 'Browse Inventory', to: '/dean/inventory', icon: 'package' },
    { title: 'New Supply Request', to: '/dean/requests/new', icon: 'plus' },
    { title: 'My Supply Requests', to: '/dean/requests', icon: 'clipboard', badgeKey: 'pending' },
    { title: 'Request History', to: '/dean/requests/history', icon: 'history' },
  ] },
  { label: 'Account', items: [
    { title: 'Profile', to: '/dean/profile', icon: 'user' },
  ] },
]
