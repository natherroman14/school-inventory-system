import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import LoginView from '../views/auth/LoginView.vue'
import NotFoundView from '../views/shared/NotFoundView.vue'
import CustodianDashboard from '../views/custodian/DashboardView.vue'
import InventoryView from '../views/custodian/InventoryView.vue'
import RequestsView from '../views/custodian/RequestsView.vue'
import TransactionsView from '../views/custodian/TransactionsView.vue'
import AlertsView from '../views/custodian/AlertsView.vue'
import AuditLogsView from '../views/custodian/AuditLogsView.vue'
import ReportsView from '../views/custodian/ReportsView.vue'
import UsersView from '../views/custodian/UsersView.vue'
import DeanDashboard from '../views/dean/DashboardView.vue'
import BrowseInventoryView from '../views/dean/BrowseInventoryView.vue'
import NewRequestView from '../views/dean/NewRequestView.vue'
import MyRequestsView from '../views/dean/MyRequestsView.vue'
import RequestHistoryView from '../views/dean/RequestHistoryView.vue'
import ProfileView from '../views/shared/ProfileView.vue'

const routes = [
  { path: '/', redirect: () => (useAuthStore().isAuthenticated ? useAuthStore().homeRoute : '/login') },
  { path: '/login', name: 'login', component: LoginView, meta: { public: true, title: 'Sign in' } },
  {
    path: '/custodian',
    component: DashboardLayout,
    redirect: '/custodian/dashboard',
    meta: { requiresAuth: true, group: 'ADMIN' },
    children: [
      { path: 'dashboard', name: 'custodian-dashboard', component: CustodianDashboard, meta: { title: 'Dashboard', subtitle: 'Inventory overview and recent activity' } },
      { path: 'inventory', name: 'custodian-inventory', component: InventoryView, meta: { title: 'Inventory Management', subtitle: 'Manage school supply items and stock levels' } },
      { path: 'requests', name: 'custodian-requests', component: RequestsView, meta: { title: 'Supply Requests', subtitle: 'Review and process departmental requisitions' } },
      { path: 'transactions', name: 'custodian-transactions', component: TransactionsView, meta: { title: 'Stock Transactions', subtitle: 'Record stock-in movements and review transaction history' } },
      { path: 'alerts', name: 'custodian-alerts', component: AlertsView, meta: { title: 'Low-Stock Alerts', subtitle: 'Items that need immediate replenishment' } },
      { path: 'audit-logs', name: 'custodian-audit', component: AuditLogsView, meta: { title: 'Audit Logs', subtitle: 'Immutable record of significant system actions' } },
      { path: 'reports', name: 'custodian-reports', component: ReportsView, meta: { title: 'Reports', subtitle: 'Generate, print, and export inventory reports' } },
      { path: 'users', name: 'custodian-users', component: UsersView, meta: { title: 'User Management', subtitle: 'Create and maintain authorized accounts' } },
      { path: 'profile', name: 'custodian-profile', component: ProfileView, meta: { title: 'Profile', subtitle: 'Your account and security settings' } },
    ],
  },
  {
    path: '/dean',
    component: DashboardLayout,
    redirect: '/dean/dashboard',
    meta: { requiresAuth: true, group: 'REQUESTER' },
    children: [
      { path: 'dashboard', name: 'dean-dashboard', component: DeanDashboard, meta: { title: 'Dashboard', subtitle: 'Supply availability and your requests' } },
      { path: 'inventory', name: 'dean-inventory', component: BrowseInventoryView, meta: { title: 'Browse Inventory', subtitle: 'Check available supplies before requesting' } },
      { path: 'requests/new', name: 'dean-new-request', component: NewRequestView, meta: { title: 'New Supply Request', subtitle: 'Choose items and submit a requisition' } },
      { path: 'requests', name: 'dean-requests', component: MyRequestsView, meta: { title: 'My Supply Requests', subtitle: 'Track your submitted requisitions' } },
      { path: 'requests/history', name: 'dean-history', component: RequestHistoryView, meta: { title: 'Request History', subtitle: 'All of your previous supply requests' } },
      { path: 'profile', name: 'dean-profile', component: ProfileView, meta: { title: 'Profile', subtitle: 'Your account and security settings' } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { public: true, title: 'Page not found' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) return auth.homeRoute
    return true
  }
  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (!auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.clearSession()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.group && auth.roleGroup !== to.meta.group) return auth.homeRoute
  return true
})

router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} | ESSU-Salcedo Inventory` : 'ESSU-Salcedo Inventory'
  document.title = title
})

export default router
