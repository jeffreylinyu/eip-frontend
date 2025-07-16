import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/', 
      component: () => import('../views/Home.vue'),
      // meta: { requiresAuth: true }
    },
    { 
      path: '/page/login', 
      component: () => import('../views/PageLogin.vue'),
      // meta: { requiresGuest: true }
    },
    {
      path: '/basic/basic-data',
      component: () => import('../views/basic/BasicData.vue'),
    },
    {
      path: '/forms/export-center',
      component: () => import('../views/forms/ExportCenter.vue'),
    },
    {
      path: '/basic/site-personnel',
      component: () => import('../views/basic/SitePersonnel.vue'),
    },
    { 
      path: '/:pathMatch(.*)*', 
      component: () => import('../views/PageError.vue') 
    }
  ],
});

// 路由守衛
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // 需要認證的路由
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/page/login');
    return;
  }
  
  // 訪客專用路由（如登入頁）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/');
    return;
  }
  
  next();
});

export default router;
