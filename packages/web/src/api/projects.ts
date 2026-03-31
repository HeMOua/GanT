import apiClient from './client'

export interface Project {
  id: number
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
  created_at: string
  updated_at: string
  totalTasks?: number
  doneTasks?: number
  inProgressTasks?: number
}

export const projectsApi = {
  getAll: () => apiClient.get<Project[]>('/projects').then(res => res.data),
  
  getById: (id: number) => apiClient.get<Project>(`/projects/${id}`).then(res => res.data),
  
  create: (data: Partial<Project>) => apiClient.post<Project>('/projects', data).then(res => res.data),
  
  update: (id: number, data: Partial<Project>) => apiClient.patch<Project>(`/projects/${id}`, data).then(res => res.data),
  
  delete: (id: number) => apiClient.delete(`/projects/${id}`).then(res => res.data),

  seed: (id: number) => apiClient.post<{ message: string }>(`/projects/${id}/seed`).then(res => res.data),
}
