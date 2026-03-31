import apiClient from './client'
import type { GanttTask } from '../components/gantt'

// Extending GanttTask with internal API specific types
export interface ApiTask extends GanttTask {
  // Any specific backend overrides
}

export const tasksApi = {
  getByProject: (projectId: number) => 
    apiClient.get<ApiTask[]>(`/projects/${projectId}/tasks`).then(res => res.data),
    
  create: (projectId: number, data: any) => 
    apiClient.post<ApiTask>(`/projects/${projectId}/tasks`, data).then(res => res.data),
    
  update: (id: number, data: any) => 
    apiClient.patch<ApiTask>(`/tasks/${id}`, data).then(res => res.data),
    
  delete: (id: number) => 
    apiClient.delete(`/tasks/${id}`).then(res => res.data),

  addDependency: (taskId: number, data: { depends_on_task_id: number; type: string; lag?: number }) =>
    apiClient.post(`/tasks/${taskId}/dependencies`, data).then(res => res.data),

  removeDependency: (taskId: number, depId: number) =>
    apiClient.delete(`/tasks/${taskId}/dependencies/${depId}`).then(res => res.data),

  addAssignee: (taskId: number, data: { member_id: number; role?: string; from_date?: string; to_date?: string }) =>
    apiClient.post(`/tasks/${taskId}/assignees`, data).then(res => res.data),

  removeAssignee: (taskId: number, assigneeId: number) =>
    apiClient.delete(`/tasks/${taskId}/assignees/${assigneeId}`).then(res => res.data),
}
