<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAppOptionStore } from '@/stores/app-option'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const appOption = useAppOptionStore()
const authStore = useAuthStore()

// 表單數據
const form = ref({
	password: 'kiki',
	email: 'kiki2e1@sample.ca'
})

const errorMessage = ref('')
const rememberMe = ref(false)

// 提交表單
const submitForm = async () => {
	if (!form.value.password || !form.value.email) {
		errorMessage.value = '請填寫所有必填欄位'
		return
	}

	const result = await authStore.login(form.value)
	
	if (result.success) {
		// 登入成功，跳轉到首頁
		router.push('/')
	} else {
		errorMessage.value = result.message
	}
}

onMounted(() => {
	appOption.appSidebarHide = true
	appOption.appHeaderHide = true
	appOption.appContentClass = 'p-0'
})

onBeforeUnmount(() => {
	appOption.appSidebarHide = false
	appOption.appHeaderHide = false
	appOption.appContentClass = ''
})
</script>
<template>
	<!-- BEGIN login -->
	<div class="login">
		<!-- BEGIN login-content -->
		<div class="login-content">
			<form v-on:submit.prevent="submitForm" method="POST" name="login_form">
				<h1 class="text-center">登入</h1>
				<div class="text-inverse text-opacity-50 text-center mb-4">
					為了您的安全，請驗證您的身分。
				</div>
				
				<!-- 錯誤訊息 -->
				<div v-if="errorMessage" class="alert alert-danger mb-3" role="alert">
					{{ errorMessage }}
				</div>

				<div class="mb-3">
					<label class="form-label">電子郵件 <span class="text-danger">*</span></label>
					<input 
						type="email" 
						class="form-control form-control-lg bg-white bg-opacity-5" 
						v-model="form.email"
						placeholder="請輸入電子郵件" 
						required
					/>
				</div>

				<div class="mb-3">
					<div class="d-flex">
						<label class="form-label">密碼 <span class="text-danger">*</span></label>
						<a href="#" class="ms-auto text-inverse text-decoration-none text-opacity-50">忘記密碼?</a>
					</div>
					<input 
						type="password" 
						class="form-control form-control-lg bg-white bg-opacity-5" 
						v-model="form.password"
						placeholder="請輸入密碼" 
						required
					/>
				</div>

				<div class="mb-3">
					<div class="form-check">
						<input 
							class="form-check-input" 
							type="checkbox" 
							v-model="rememberMe"
							id="customCheck1" 
						/>
						<label class="form-check-label" for="customCheck1">記住我</label>
					</div>
				</div>

				<button 
					type="submit" 
					class="btn btn-outline-theme btn-lg d-block w-100 fw-500 mb-3"
					:disabled="authStore.isLoading"
				>
					<span v-if="authStore.isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
					{{ authStore.isLoading ? '登入中...' : '登入' }}
				</button>

				<div class="text-center text-inverse text-opacity-50">
					還沒有帳戶嗎？ <RouterLink to="/page/register">註冊</RouterLink>.
				</div>
			</form>
		</div>
		<!-- END login-content -->
	</div>
	<!-- END login -->
</template>