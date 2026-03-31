import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tasksApi, type ApiTask } from '../api/tasks'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<ApiTask[]>([])
  const loading = ref(false)

  async function fetchTasks(projectId: number) {
    loading.value = true
    try {
      tasks.value = await tasksApi.getByProject(projectId)
    } finally {
      loading.value = false
    }
  }

  async function createTask(projectId: number, data: any) {
    const newTask = await tasksApi.create(projectId, data)
    await fetchTasks(projectId) // Re-fetch to get nested relations easily, or push directly
    return newTask
  }

  async function updateTask(taskId: number, data: any, projectId: number) {
    await tasksApi.update(taskId, data)
    await fetchTasks(projectId)
  }

  async function deleteTask(taskId: number, projectId: number) {
    await tasksApi.delete(taskId)
    await fetchTasks(projectId)
  }

  // Task dependencies
  async function addDependency(taskId: number, data: any, projectId: number) {
    await tasksApi.addDependency(taskId, data)
    await fetchTasks(projectId)
  }

  async function removeDependency(taskId: number, depId: number, projectId: number) {
    await tasksApi.removeDependency(taskId, depId)
    await fetchTasks(projectId)
  }

  // Task assignees
  async function addAssignee(taskId: number, data: any, projectId: number) {
    await tasksApi.addAssignee(taskId, data)
    await fetchTasks(projectId)
  }

  async function removeAssignee(taskId: number, assigneeId: number, projectId: number) {
    await tasksApi.removeAssignee(taskId, assigneeId)
    await fetchTasks(projectId)
  }

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addDependency,
    removeDependency,
    addAssignee,
    removeAssignee
  }
})
