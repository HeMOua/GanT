import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(credentials: any) {
    const res = await authApi.login(credentials)
    setSession(res.access_token, res.user)
  }

  async function register(data: any) {
    const res = await authApi.register(data)
    setSession(res.access_token, res.user)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  function setSession(newToken: string, newUser: any) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  return { token, user, isAuthenticated, login, register, logout }
})
