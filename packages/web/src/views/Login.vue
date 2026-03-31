<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const displayName = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  
  errorMsg.value = ''
  loading.value = true
  
  try {
    if (isLogin.value) {
      await authStore.login({ username: username.value, password: password.value })
    } else {
      await authStore.register({ 
        username: username.value, 
        password: password.value,
        display_name: displayName.value || username.value
      })
    }
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <span class="icon">📊</span>
          <span class="text">GanT 任务管理</span>
        </div>
        <h2 class="auth-title">{{ isLogin ? '欢迎回来' : '创建新账号' }}</h2>
        <p class="auth-subtitle">
          {{ isLogin ? '请登录以管理您的项目与任务' : '加入系统，开始高效协作' }}
        </p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group" v-if="!isLogin">
          <label>姓名 / 昵称 (可选)</label>
          <input type="text" v-model="displayName" placeholder="例如：张大伟" />
        </div>
        
        <div class="form-group">
          <label>用户名</label>
          <input type="text" v-model="username" placeholder="请输入用户名" required />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input type="password" v-model="password" placeholder="请输入密码" required />
        </div>

        <div class="form-error" v-if="errorMsg">{{ errorMsg }}</div>

        <button type="submit" class="auth-submit" :disabled="loading">
          <span class="spinner" v-if="loading"></span>
          <span v-else>{{ isLogin ? '登 录' : '注 册' }}</span>
        </button>
      </form>

      <div class="auth-footer">
        <a href="#" @click.prevent="isLogin = !isLogin; errorMsg = ''">
          {{ isLogin ? '没有账号？点击注册' : '已有账号？点击登录' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  font-family: 'Inter', system-ui, sans-serif;
  color: #333;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transform: translateY(-20px);
  animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.auth-header {
  text-align: center;
  margin-bottom: 36px;
}

.auth-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.auth-logo .icon {
  font-size: 32px;
}

.auth-logo .text {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: #64748b;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  color: #1e293b;
  transition: all 0.2s ease;
  outline: none;
}

.form-group input:focus {
  background: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-error {
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.auth-submit {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 
              0 2px 4px -2px rgba(37, 99, 235, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54px;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 
              0 4px 6px -4px rgba(37, 99, 235, 0.3);
}

.auth-submit:active:not(:disabled) {
  transform: translateY(1px);
}

.auth-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-footer {
  margin-top: 32px;
  text-align: center;
}

.auth-footer a {
  color: #64748b;
  font-size: 14px;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.auth-footer a:hover {
  color: #2563eb;
}
</style>
