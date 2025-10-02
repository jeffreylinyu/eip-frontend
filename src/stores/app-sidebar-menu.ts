import { defineStore } from "pinia";

interface MenuItem {
  text?: string;
  is_header?: boolean;
  is_divider?: boolean;
  url?: string;
  icon?: string;
  highlight?: boolean;
  children?: MenuItem[];
  label?: string;
}

export const useAppSidebarMenuStore = defineStore("appSidebarMenu", () => {
  return [
    // 系統核心功能
    { text: "系統核心功能", is_header: true },
    { url: "/", icon: "bi bi-speedometer2", text: "首頁 (Dashboard)" },

    //基本資料維護
    { text: "基本資料維護", is_header: true },
    {
      text: "基本資料",
      icon: "bi bi-database",
      children: [
        { text: "基本資料維護", url: "/basic/basic-data" },
        { text: "工地相關人員", url: "/basic/site-personnel" },
      ],
    },

    // 用戶管理
    { text: "用戶管理", is_header: true },
    { text: "用戶管理與權限", url: "/user-management", icon: "bi bi-people" },

    // 工程日報表管理
    { text: "工程日報表管理", is_header: true },
    {
      text: "日報表管理",
      icon: "bi bi-journal-text",
      children: [
        { text: "日報表總覽", url: "/daily-report" },
        { text: "材料進場", url: "/daily-report/materials" },
        { text: "出工紀錄", url: "/daily-report/labor" },
        { text: "機具出工", url: "/daily-report/equipment" },
        { text: "進場紀錄", url: "/daily-report/incoming" },
        { text: "材料檢驗", url: "/daily-report/inspection" },
        { text: "安全衛生", url: "/daily-report/safety" },
        { text: "施工記錄", url: "/daily-report/construction" },
        { text: "重要記事", url: "/daily-report/notes" },
        { text: "明日進度", url: "/daily-report/tomorrow" },
        { text: "製表人", url: "/daily-report/preparer" },
        { text: "日報表歷史", url: "/daily-report/history" },
      ],
    },

    // 文件與表單管理
    { text: "文件與表單管理", is_header: true },
    {
      text: "表單生成與管理",
      icon: "bi bi-file-earmark-text",
      children: [
        { text: "表單匯出中心", url: "/forms/export-center" },
        { 
          text: "A類表單", 
          children: [
            { text: "A-4 工期展延申請總表", url: "/forms/a4-download" },
            { text: "A-5 估驗請款計價單", url: "/forms/a5-download" },
            // { text: "A-5 參數化表單", url: "/forms/a5-with-params" },
            { text: "A-7 職安報備書", url: "/forms/a7-download" },
          ]
        },
        { text: "B類表單", url: "/forms/type-b" },
        { text: "C類表單", url: "/forms/type-c" },
        { text: "D類表單", url: "/forms/type-d" },
        { text: "H類表單", url: "/forms/type-h" },
        { text: "I類表單", url: "/forms/type-i" },
        { text: "L類表單", url: "/forms/type-l" },
      ],
    },

    // 查詢與檢索
    { text: "查詢與檢索", is_header: true },
    { url: "/search", icon: "bi bi-search", text: "文件快速查詢" },

    // AI與自動化
    { text: "AI與自動化", is_header: true },
    { url: "/ai/ocr", icon: "bi bi-file-text", text: "文件OCR識別" },
    { url: "/ai/reply-gen", icon: "bi bi-chat-dots", text: "自動回文生成" },
    {
      url: "/ai/defect-detection",
      icon: "bi bi-exclamation-triangle",
      text: "工地缺失辨識",
    },

    // 系統稽核與提醒
    { text: "系統稽核與提醒", is_header: true },
    { url: "/audit/reminders", icon: "bi bi-bell", text: "文件提醒與稽核" },

    // 雲端資料整合
    { text: "雲端資料整合", is_header: true },
    {
      url: "/integration/cloud-database",
      icon: "bi bi-cloud-upload",
      text: "雲端資料庫整合",
    },
    {
      url: "/integration/web-scraper",
      icon: "bi bi-globe2",
      text: "網站資料爬蟲",
    },
  ] as MenuItem[];
});
