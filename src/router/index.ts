import { createRouter, createWebHistory } from 'vue-router'
import APP_2 from '../APP_2.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: APP_2,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
