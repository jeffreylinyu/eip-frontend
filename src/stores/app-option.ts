import { defineStore } from "pinia";

export const useAppOptionStore = defineStore("appOption", () => {
	return {
		appMode: 'dark',
		appThemeClass: '',
		appCoverClass: '',
		appBoxedLayout: false,
		appHeaderHide: false,
		appHeaderSearchToggled: false,
		appSidebarToggled: true,
		appSidebarCollapsed: false,
		appSidebarMobileToggled: false,
		appSidebarMobileClosed: false,
		appSidebarHide: false,
		appContentFullHeight: true,
		appContentClass: '',
		appTopNav: false,
		appFooter: false,
		appFooterFixed: false,
		appThemePanelToggled: false,
    /** 是否顯示 B-1 監造計劃書核心資料填寫狀況 Modal（全域專案 Header 用） */
    showCoreDataStatusModal: false,
	}
});
