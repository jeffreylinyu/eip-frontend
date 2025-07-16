<script>
export default {
  name: 'Toast',
  data() {
    return {
      toasts: []
    }
  },
  methods: {
    // 顯示Toast提示
    show(message, type = 'info', duration = 3000) {
      const toast = {
        id: Date.now(),
        message,
        type,
        show: true
      };
      
      this.toasts.push(toast);
      
      // 自動隱藏
      setTimeout(() => {
        this.hide(toast.id);
      }, duration);
    },
    
    // 隱藏Toast
    hide(id) {
      const index = this.toasts.findIndex(toast => toast.id === id);
      if (index > -1) {
        this.toasts[index].show = false;
        // 動畫結束後移除
        setTimeout(() => {
          this.toasts.splice(index, 1);
        }, 150);
      }
    },
    
    // 獲取Toast圖標類
    getToastIcon(type) {
      switch(type) {
        case 'success':
          return 'fa-check-circle text-success';
        case 'error':
          return 'fa-exclamation-circle text-danger';
        case 'warning':
          return 'fa-exclamation-triangle text-warning';
        default:
          return 'fa-info-circle text-info';
      }
    },
    
    // 快捷方法
    success(message, duration = 3000) {
      this.show(message, 'success', duration);
    },
    
    error(message, duration = 3000) {
      this.show(message, 'error', duration);
    },
    
    warning(message, duration = 3000) {
      this.show(message, 'warning', duration);
    },
    
    info(message, duration = 3000) {
      this.show(message, 'info', duration);
    }
  }
}
</script>

<template>
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1055;">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="{ 'show': toast.show }"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="toast-header">
        <i class="fa me-2" :class="getToastIcon(toast.type)"></i>
        <strong class="me-auto">系統提示</strong>
        <button type="button" class="btn-close" @click="hide(toast.id)" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.15s ease-in-out;
}

.toast.show {
  opacity: 1;
  transform: translateX(0);
}

.toast:not(.show) {
  opacity: 0;
  transform: translateX(100%);
}
</style> 