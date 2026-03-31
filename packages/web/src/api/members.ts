import apiClient from './client'

export interface Member {
  id: number
  name: string
  avatar?: string
  role?: string
}

export const membersApi = {
  getAll: () => apiClient.get<Member[]>('/members').then(res => res.data),
  
  create: (data: Partial<Member>) => apiClient.post<Member>('/members', data).then(res => res.data),
  
  update: (id: number, data: Partial<Member>) => apiClient.patch<Member>(`/members/${id}`, data).then(res => res.data),
  
  delete: (id: number) => apiClient.delete(`/members/${id}`).then(res => res.data),
}
