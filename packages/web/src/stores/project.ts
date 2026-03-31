import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectsApi, type Project } from '../api/projects'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)

  async function fetchProjects() {
    loading.value = true
    try {
      projects.value = await projectsApi.getAll()
    } finally {
      loading.value = false
    }
  }

  async function fetchProjectById(id: number) {
    loading.value = true
    try {
      currentProject.value = await projectsApi.getById(id)
    } finally {
      loading.value = false
    }
  }

  async function createProject(data: Partial<Project>) {
    const newProject = await projectsApi.create(data)
    projects.value.unshift(newProject)
    return newProject
  }

  async function updateProject(id: number, data: Partial<Project>) {
    const updated = await projectsApi.update(id, data)
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = { ...projects.value[index], ...updated }
    }
    if (currentProject.value?.id === id) {
      currentProject.value = { ...currentProject.value, ...updated }
    }
    return updated
  }

  async function deleteProject(id: number) {
    await projectsApi.delete(id)
    projects.value = projects.value.filter(p => p.id !== id)
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
  }

  async function seedProject(id: number) {
    await projectsApi.seed(id)
    await fetchProjectById(id)
  }

  return {
    projects,
    currentProject,
    loading,
    fetchProjects,
    fetchProjectById,
    createProject,
    updateProject,
    deleteProject,
    seedProject
  }
})
