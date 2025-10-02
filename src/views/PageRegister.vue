<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAppOptionStore } from '@/stores/app-option'
import { authApi, type IndividualRegisterData } from '@/api/user'

const router = useRouter()
const appOption = useAppOptionStore()

// 個人戶表單
const individualForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'OWNER'
})

const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

// 清除訊息
const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

// 統一的表單驗證系統
const FormValidator = {
  // 設置自定義驗證消息
  setupCustomMessages(formElement: HTMLFormElement) {
    const inputs = formElement.querySelectorAll('input, select')
    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement

      // 設置無效時的自定義消息
      element.addEventListener('invalid', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement
        const validity = target.validity

        // 如果是確認密碼欄位且已經有自定義消息，不要覆蓋
        if (target.name === 'confirmPassword' && target.validationMessage && target.validationMessage !== '') {
          return // 保持已設置的自定義消息
        }

        if (validity.valueMissing) {
          target.setCustomValidity('請填寫這個欄位')
        } else if (validity.typeMismatch) {
          if (target.type === 'email') {
            target.setCustomValidity('請輸入正確的電子郵件格式')
          } else {
            target.setCustomValidity('請輸入正確的格式')
          }
        } else if (validity.tooShort) {
          const minLength = (target as HTMLInputElement).minLength
          target.setCustomValidity(`至少需要輸入 ${minLength} 個字元`)
        } else if (validity.tooLong) {
          const maxLength = (target as HTMLInputElement).maxLength
          target.setCustomValidity(`最多只能輸入 ${maxLength} 個字元`)
        } else {
          target.setCustomValidity('請檢查輸入內容')
        }
      })

      // 輸入時清除自定義錯誤
      element.addEventListener('input', () => {
        element.setCustomValidity('')
      })
    })
  },

  // 驗證密碼確認
  validatePasswordConfirmation(formElement: HTMLFormElement): boolean {
    const confirmPasswordInput = formElement.querySelector('input[name="confirmPassword"]') as HTMLInputElement
    if (!confirmPasswordInput) return true

    const password = individualForm.value.password
    const confirmPassword = confirmPasswordInput.value

    if (password !== confirmPassword) {
      confirmPasswordInput.setCustomValidity('密碼確認不一致')
      confirmPasswordInput.reportValidity()
      return false
    } else {
      confirmPasswordInput.setCustomValidity('')
      return true
    }
  },

  // 執行完整驗證
  validate(): boolean {
    clearMessages()
    
    const formElement = document.querySelector('form[name="register_form"]') as HTMLFormElement
    if (!formElement) return false

    // 1. 檢查基本的 HTML5 驗證
    const basicValidation = formElement.checkValidity()
    if (!basicValidation) {
      formElement.reportValidity()
      return false
    }

    // 2. 檢查密碼確認
    const passwordConfirmation = this.validatePasswordConfirmation(formElement)
    if (!passwordConfirmation) {
      return false
    }

    return true
  },

  // 初始化驗證系統
  init() {
    const formElement = document.querySelector('form[name="register_form"]') as HTMLFormElement
    if (formElement) {
      this.setupCustomMessages(formElement)
    }
  }
}

// 驗證表單（對外接口）
const validateForm = (): boolean => {
  return FormValidator.validate()
}

// 提交表單
const submitForm = async () => {
  if (!validateForm()) return

  isLoading.value = true
  
  try {
    // 個人戶註冊
    const registerData: IndividualRegisterData = {
      username: individualForm.value.username,
      email: individualForm.value.email,
      password: individualForm.value.password,
    }
    
    await authApi.registerIndividual(registerData)

    successMessage.value = '註冊成功！請前往登入頁面。'
    
    // 3秒後跳轉到登入頁面
    setTimeout(() => {
      router.push('/page/login')
    }, 3000)

  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message || '註冊失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  appOption.appSidebarHide = true
  appOption.appHeaderHide = true
  appOption.appContentClass = 'p-0'
  
  // 初始化表單驗證系統
  setTimeout(() => {
    FormValidator.init()
  }, 100)
})

onBeforeUnmount(() => {
  appOption.appSidebarHide = false
  appOption.appHeaderHide = false
  appOption.appContentClass = ''
})
</script>

<template>
  <!-- BEGIN register -->
  <div class="login">
    <!-- BEGIN register-content -->
    <div class="login-content">
      <form @submit.prevent="submitForm" method="POST" name="register_form">
        <h1 class="text-center">註冊</h1>
        <div class="text-inverse text-opacity-50 text-center mb-4">
          填寫您的基本資訊以建立帳戶。
        </div>
        
        <!-- 成功訊息 -->
        <div v-if="successMessage" class="alert alert-success mb-3" role="alert">
          <i class="fa fa-check-circle me-2"></i>
          {{ successMessage }}
        </div>

        <!-- 錯誤訊息 -->
        <div v-if="errorMessage" class="alert alert-danger mb-3" role="alert">
          <i class="fa fa-exclamation-triangle me-2"></i>
          {{ errorMessage }}
        </div>

        <!-- 個人資料表單 -->
        <div class="mb-3">
          <label class="form-label">姓名 <span class="text-danger">*</span></label>
          <input 
            type="text" 
            class="form-control form-control-lg bg-white bg-opacity-5" 
            v-model="individualForm.username"
            placeholder="請輸入姓名" 
            name="username"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">電子郵件 <span class="text-danger">*</span></label>
          <input 
            type="email" 
            class="form-control form-control-lg bg-white bg-opacity-5" 
            v-model="individualForm.email"
            placeholder="請輸入電子郵件" 
            name="email"
            required
          />
        </div>

        <div class="mb-3">
          <label class="form-label">密碼 <span class="text-danger">*</span></label>
          <input 
            type="password" 
            class="form-control form-control-lg bg-white bg-opacity-5" 
            v-model="individualForm.password"
            placeholder="請輸入密碼（至少6個字元）" 
            name="password"
            minlength="6"
            required
          />
        </div>

        <div class="mb-4">
          <label class="form-label">確認密碼 <span class="text-danger">*</span></label>
          <input 
            type="password" 
            class="form-control form-control-lg bg-white bg-opacity-5" 
            v-model="individualForm.confirmPassword"
            placeholder="請再次輸入密碼" 
            name="confirmPassword"
            required
          />
        </div>

        <button 
          type="submit" 
          class="btn btn-outline-theme btn-lg d-block w-100 fw-500 mb-3"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {{ isLoading ? '註冊中...' : '註冊' }}
        </button>

        <div class="text-center text-inverse text-opacity-50">
          已經有帳戶了嗎？ <RouterLink to="/page/login">登入</RouterLink>.
        </div>
      </form>
    </div>
    <!-- END register-content -->
  </div>
  <!-- END register -->
</template>

<style scoped>
</style> 