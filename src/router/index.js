import { createRouter, createWebHistory } from 'vue-router'
import { useSetupStore } from '../stores/setupStore.js'

import HomePage from '../pages/HomePage.vue'
import SetupQuizPage from '../pages/SetupQuizPage.vue'
import RecommendationPage from '../pages/RecommendationPage.vue'
import LearningCenterPage from '../pages/LearningCenterPage.vue'
import SavedBuildsPage from '../pages/SavedBuildsPage.vue'

const routes = [
  { path: '/', name: 'home', component: HomePage, meta: { title: 'MyRig' } },
  { path: '/quiz', name: 'quiz', component: SetupQuizPage, meta: { title: 'Setup Quiz - MyRig' } },
  {
    path: '/recommendation',
    name: 'recommendation',
    component: RecommendationPage,
    meta: { title: 'Your Setup - MyRig', requiresSetup: true },
  },
  {
    path: '/learn',
    name: 'learn',
    component: LearningCenterPage,
    meta: { title: 'Learning Center - MyRig' },
  },
  {
    path: '/builds',
    name: 'builds',
    component: SavedBuildsPage,
    meta: { title: 'Saved Builds - MyRig' },
  },
  // Anything else goes home rather than showing a blank page.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})

router.beforeEach((to) => {
  document.title = to.meta.title || 'MyRig'

  // You cannot land on the recommendation page without having generated a setup.
  if (to.meta.requiresSetup && !useSetupStore().hasSetup) {
    return { name: 'quiz' }
  }

  return true
})

export default router
