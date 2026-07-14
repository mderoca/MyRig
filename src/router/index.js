import { createRouter, createWebHistory } from 'vue-router'
import { useSetupStore } from '../stores/setupStore.js'
import { useAuthStore } from '../stores/authStore.js'

import HomePage from '../pages/HomePage.vue'
import StorePage from '../pages/StorePage.vue'
import CanIRunItPage from '../pages/CanIRunItPage.vue'
import BuilderPage from '../pages/BuilderPage.vue'
import SetupQuizPage from '../pages/SetupQuizPage.vue'
import RecommendationPage from '../pages/RecommendationPage.vue'
import LearningCenterPage from '../pages/LearningCenterPage.vue'
import CartPage from '../pages/CartPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import SavedBuildsPage from '../pages/SavedBuildsPage.vue'
import WishlistPage from '../pages/WishlistPage.vue'
import OrdersPage from '../pages/OrdersPage.vue'
import AccountPage from '../pages/AccountPage.vue'

/**
 * meta.requiresAuth  - signed-out visitors are bounced to /login, and sent back
 *                      here once they sign in
 * meta.guestOnly     - /login and /register are pointless when already signed in
 * meta.requiresSetup - you cannot land on the recommendation page without a setup
 */
const routes = [
  { path: '/', name: 'home', component: HomePage, meta: { title: 'MyRig - Design the rig that fits you' } },
  { path: '/shop', name: 'shop', component: StorePage, meta: { title: 'Shop - MyRig' } },
  { path: '/can-i-run-it', name: 'can-i-run-it', component: CanIRunItPage, meta: { title: 'Can I Run It? - MyRig' } },
  { path: '/custom', name: 'custom', component: BuilderPage, meta: { title: 'Custom Build - MyRig' } },
  { path: '/quiz', name: 'quiz', component: SetupQuizPage, meta: { title: 'Setup Quiz - MyRig' } },
  {
    path: '/recommendation',
    name: 'recommendation',
    component: RecommendationPage,
    meta: { title: 'Your Setup - MyRig', requiresSetup: true },
  },
  { path: '/learn', name: 'learn', component: LearningCenterPage, meta: { title: 'Learning Center - MyRig' } },
  { path: '/cart', name: 'cart', component: CartPage, meta: { title: 'Cart - MyRig' } },

  { path: '/login', name: 'login', component: LoginPage, meta: { title: 'Sign in - MyRig', guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterPage, meta: { title: 'Create account - MyRig', guestOnly: true } },

  { path: '/builds', name: 'builds', component: SavedBuildsPage, meta: { title: 'Saved Builds - MyRig', requiresAuth: true } },
  { path: '/wishlist', name: 'wishlist', component: WishlistPage, meta: { title: 'Wishlist - MyRig', requiresAuth: true } },
  { path: '/orders', name: 'orders', component: OrdersPage, meta: { title: 'Orders - MyRig', requiresAuth: true } },
  { path: '/account', name: 'account', component: AccountPage, meta: { title: 'Account - MyRig', requiresAuth: true } },

  // Anything else goes home rather than showing a blank page.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})

router.beforeEach(async (to) => {
  document.title = to.meta.title || 'MyRig'

  const auth = useAuthStore()
  // Restores the session from the httpOnly cookie on a hard load. Resolves once
  // and is cached, so this is not a request per navigation.
  await auth.restore()

  if (to.meta.requiresAuth && !auth.isSignedIn) {
    // redirect= sends them back to where they were headed after signing in.
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isSignedIn) {
    return { name: 'account' }
  }

  if (to.meta.requiresSetup && !useSetupStore().hasSetup) {
    return { name: 'quiz' }
  }

  return true
})

export default router
