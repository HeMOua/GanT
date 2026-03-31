import apiClient from './client'

export const authApi = {
  login: (data: any) => apiClient.post('/auth/login', data).then(res => res.data),
  register: (data: any) => apiClient.post('/auth/register', data).then(res => res.data),
}
