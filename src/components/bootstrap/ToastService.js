import { createApp } from 'vue';
import Toast from './Toast.vue';

class ToastService {
  constructor() {
    this.toastContainer = null;
    this.toastApp = null;
    this.toastComponent = null;
    this.init();
  }

  // 初始化Toast容器
  init() {
    // 如果已經存在，直接返回
    if (this.toastContainer) {
      return;
    }

    // 創建容器元素
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'global-toast-container';
    document.body.appendChild(this.toastContainer);

    // 創建Vue應用實例
    this.toastApp = createApp(Toast);
    this.toastComponent = this.toastApp.mount(this.toastContainer);
  }

  // 顯示Toast
  show(message, type = 'info', duration = 3000) {
    this.init(); // 確保已初始化
    return this.toastComponent.show(message, type, duration);
  }

  // 快捷方法
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 3000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 3000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  // 銷毀Toast服務
  destroy() {
    if (this.toastApp) {
      this.toastApp.unmount();
      this.toastApp = null;
      this.toastComponent = null;
    }
    if (this.toastContainer) {
      document.body.removeChild(this.toastContainer);
      this.toastContainer = null;
    }
  }
}

// 創建單例實例
const toastService = new ToastService();

// 導出服務實例
export default toastService;

// 導出安裝插件的方法
export const ToastPlugin = {
  install(app) {
    // 將toast服務掛載到全局屬性
    app.config.globalProperties.$toast = toastService;
    
    // 也可以通過provide/inject使用
    app.provide('toast', toastService);
  }
}; 