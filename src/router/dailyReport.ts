import type { RouteRecordRaw } from 'vue-router'

export const dailyReportRoutes: RouteRecordRaw[] = [
  {
    path: '/daily-report',
    name: 'DailyReport',
    component: () => import('@/views/daily-report/DailyReportOverview.vue'),
    meta: {
      title: '工程日報表',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/overview',
    name: 'DailyReportOverview',
    component: () => import('@/views/daily-report/DailyReportOverview.vue'),
    meta: {
      title: '日報表總覽',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/materials',
    name: 'MaterialsSection',
    component: () => import('@/views/daily-report/MaterialsSection.vue'),
    meta: {
      title: '材料進場與使用',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/labor',
    name: 'LaborSection',
    component: () => import('@/views/daily-report/LaborSection.vue'),
    meta: {
      title: '出工紀錄',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/equipment',
    name: 'EquipmentSection',
    component: () => import('@/views/daily-report/EquipmentSection.vue'),
    meta: {
      title: '機具出工紀錄',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/incoming',
    name: 'IncomingSection',
    component: () => import('@/views/daily-report/IncomingSection.vue'),
    meta: {
      title: '進場材料/機具/雜項紀錄',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/inspection',
    name: 'InspectionSection',
    component: () => import('@/views/daily-report/InspectionSection.vue'),
    meta: {
      title: '現場材料檢驗',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/safety',
    name: 'SafetySection',
    component: () => import('@/views/daily-report/SafetySection.vue'),
    meta: {
      title: '勞工安全衛生',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/construction',
    name: 'ConstructionSection',
    component: () => import('@/views/daily-report/ConstructionSection.vue'),
    meta: {
      title: '每日施工記錄',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/notes',
    name: 'NotesSection',
    component: () => import('@/views/daily-report/NotesSection.vue'),
    meta: {
      title: '重要記事',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/tomorrow',
    name: 'TomorrowSection',
    component: () => import('@/views/daily-report/TomorrowSection.vue'),
    meta: {
      title: '明日預定進度',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/preparer',
    name: 'PreparerSection',
    component: () => import('@/views/daily-report/PreparerSection.vue'),
    meta: {
      title: '製表人資訊',
      requiresAuth: true
    }
  },
  {
    path: '/daily-report/history',
    name: 'DailyReportHistory',
    component: () => import('@/views/daily-report/DailyReportHistory.vue'),
    meta: {
      title: '日報表歷史',
      requiresAuth: true
    }
  }
]
