import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import EntryView from '../views/EntryView.vue'
import ExitView from '../views/ExitView.vue'
import ParkingListView from '../views/ParkingListView.vue'
import SettingsView from '../views/SettingsView.vue'
import NoticesView from '../views/NoticesView.vue'
import MyInfoView from '../views/MyInfoView.vue'
import UserManagementView from '../views/UserManagementView.vue'

const routes = [
  { path: '/', redirect: '/admin/dashboard' },
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAdmin: true } },
      { path: 'entry', name: 'entry', component: EntryView },
      { path: 'exit', name: 'exit', component: ExitView },
      { path: 'parking', name: 'parking', component: ParkingListView, meta: { requiresAdmin: true } },
      { path: 'notices', name: 'notices', component: NoticesView },
      { path: 'my', name: 'my-info', component: MyInfoView },
      { path: 'users', name: 'users', component: UserManagementView, meta: { requiresAdmin: true } },
      { path: 'settings', name: 'settings', component: SettingsView, meta: { requiresAdmin: true } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login'
  if (to.meta.requiresAdmin && !auth.isAdmin) return '/admin/my'
  if (to.name === 'login' && auth.isAuthenticated) {
    return auth.isAdmin ? '/admin/dashboard' : '/admin/my'
  }
})

export default router
