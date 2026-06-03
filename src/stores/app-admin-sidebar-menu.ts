import { defineStore } from "pinia";
import { computed } from "vue";
import { useAuthStore } from '@/stores/auth';
import type { SidebarMenuItem as MenuItem } from '@/types/sidebar-menu'

function filterAdminMenuItems(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => {
    if (item.visible === false) {
      return false
    }
    if (item.children) {
      item.children = filterAdminMenuItems(item.children)
      if (item.children.length === 0 && !item.url) {
        return false
      }
    }
    return true
  })
}

export const useAppAdminSidebarMenuStore = defineStore("appAdminSidebarMenu", () => {
  const authStore = useAuthStore();

  const hasAdminPermission = computed(() => {
    const role = authStore.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return isAdmin;
  });

  // 系統管理側邊欄選單項目
  const menuItems = computed(() => {
    const systemRole = authStore.user?.systemRole || authStore.user?.role;
    const isSuperAdmin = systemRole === 'SUPER_ADMIN';

    const items: MenuItem[] = [
      // 工程管理
      { text: "工程管理", is_header: true },
      {
        text: "所有工程案",
        icon: "bi bi-list-ul",
        url: "/admin/projects",
      },
      {
        text: "建立新工程案",
        icon: "bi bi-plus-square",
        url: "/admin/create-project",
      },

      // PCCES相關根基資料標題
      { text: "PCCES相關根基資料", is_header: true },
      
      {
        text: "PCCES總項目",
        icon: "bi bi-collection",
        url: "/admin/pcces-catalog",
      },
      {
        text: "施工抽查標準表",
        icon: "bi bi-clipboard-check",
        url: "/admin/inspection-standard",
      },
      {
        text: "安全衛生抽查標準表",
        icon: "bi bi-shield-check",
        url: "/admin/safety-health-inspection-standard",
      },
      {
        text: "材料抽查標準表",
        icon: "bi bi-box-seam",
        url: "/admin/material-inspection-standard",
      },
      
      // 帳號與權限
      { text: "公司與用戶管理", is_header: true },
      {
        text: "公司與權限中心",
        icon: "bi bi-shield-lock",
        url: "/admin/company-hub",
      },
      {
        text: "用戶管理",
        icon: "bi bi-people",
        url: "/admin/users",
      },

      // 官網與對外（僅 SUPER_ADMIN；API 亦限制）
      { text: "官網與對外", is_header: true, visible: isSuperAdmin },
      {
        text: "官網預約示範紀錄",
        icon: "bi bi-calendar-check",
        url: "/admin/website-demo-bookings",
        visible: isSuperAdmin,
      },

      // 工程案資料建構工具測試（僅供管理員驗證設定）
      { text: "工程案資料建構工具測試", is_header: true },
      {
        text: "OCR 測試",
        icon: "bi bi-file-text",
        url: "/admin/ai-ocr-test",
      },
      {
        text: "LLM 測試",
        icon: "bi bi-robot",
        url: "/admin/ai-llm-test",
      },
      
      // 未來可以添加更多系統管理功能
      // { text: "帳號權限管理", url: "/admin/user-roles", icon: "bi bi-person-shield" },
      // { text: "系統日誌", url: "/admin/system-logs", icon: "bi bi-file-text" },
      // { text: "系統設定", url: "/admin/settings", icon: "bi bi-gear" },
    ];

    if (!hasAdminPermission.value) {
      return [];
    }

    return filterAdminMenuItems(items);
  });

  // Pinia setup store 必須回傳 object；computed/ref 會在 store 上自動 unref
  return {
    menuItems,
  };
});

