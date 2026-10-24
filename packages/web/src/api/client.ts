import { invoke, isTauri } from '@tauri-apps/api/core'
import axios from 'axios'
import router from '../router'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Desktop requests never open an HTTP connection.
if (isTauri()) {
  apiClient.defaults.adapter = async config => {
    try {
      const data = await invoke('local_request', {
        method: (config.method || 'get').toUpperCase(),
        path: config.url,
        data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data ?? null,
      })
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    } catch (message) {
      return Promise.reject({ message: String(message), response: { data: { message: String(message) } } })
    }
  }
}

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async function (error) {
    if (error.response?.status === 401) {
      // Unauthorized, clear token and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
