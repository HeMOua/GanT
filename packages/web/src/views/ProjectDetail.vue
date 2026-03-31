<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useTaskStore } from '../stores/task'
import { useAuthStore } from '../stores/auth'
import { GanttChart } from '../components/gantt'
import type { GanttTask, ViewMode } from '../components/gantt'
import TaskEditDialog from '../components/TaskEditDialog.vue'

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const authStore = useAuthStore()

const projectId = parseInt(props.id, 10)
const viewMode = ref<ViewMode>('day')
const isEditing = ref(false)
const selectedTask = ref<any>(null)
const isGeneratingMocks = ref(false)
const users = ref<any[]>([])

onMounted(async () => {
  await projectStore.fetchProjectById(projectId)
  await taskStore.fetchTasks(projectId)
  if (authStore.user?.role === 'ADMIN') {
    try {
      const { default: api } = await import('../api/client')
      const res = await api.get('/users')
      users.value = res.data
    } catch(e) {
      console.error('Failed to load users', e)
    }
  }
})

function goBack() {
  router.push('/')
}

function handleTaskClick(task: GanttTask) {
  // Can be used to highlight task details
  console.log('Clicked', task)
}

function handleTaskDblclick(task: GanttTask) {
  // Open task edit dialog
  selectedTask.value = taskStore.tasks.find(t => t.id === task.id) || null
  if (selectedTask.value) {
    isEditing.value = true
  }
}

function handleCreateTask() {
  selectedTask.value = null
  isEditing.value = true
}

async function handleSaveTask(taskData: any) {
  if (selectedTask.value) {
    await taskStore.updateTask(selectedTask.value.id, taskData, projectId)
  } else {
    await taskStore.createTask(projectId, taskData)
  }
  isEditing.value = false
}

async function handleDeleteTask(taskId: number) {
  if (confirm('确定要删除这个任务吗？相关依赖也会被清除。')) {
    await taskStore.deleteTask(taskId, projectId)
    isEditing.value = false
  }
}

async function handleAddAssignee(taskId: number, userId: number) {
  await taskStore.addAssignee(taskId, { user_id: userId }, projectId)
  selectedTask.value = taskStore.tasks.find((t: any) => t.id === taskId) || null
}

async function handleRemoveAssignee(taskId: number, assigneeId: number) {
  await taskStore.removeAssignee(taskId, assigneeId, projectId)
  selectedTask.value = taskStore.tasks.find((t: any) => t.id === taskId) || null
}

async function generateMocks() {
  if (confirm('这将清除当前项目的所有任务，并填充演示数据。确定继续吗？')) {
    isGeneratingMocks.value = true
    try {
      await projectStore.seedProject(projectId)
      await taskStore.fetchTasks(projectId)
    } finally {
      isGeneratingMocks.value = false
    }
  }
}
</script>

<template>
  <div class="project-detail">
    <div v-if="projectStore.loading && !projectStore.currentProject" class="loading-state">
      <div class="spinner"></div>
    </div>
    
    <template v-else-if="projectStore.currentProject">
      <header class="detail-header">
        <div class="header-left">
          <button class="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          
          <div class="project-info">
            <h1 class="project-name">{{ projectStore.currentProject.name }}</h1>
            <p class="project-desc">{{ projectStore.currentProject.description || '无描述' }}</p>
          </div>
        </div>
        
        <div class="header-right" v-if="authStore.user?.role === 'ADMIN'">
          <button 
            v-if="taskStore.tasks.length === 0" 
            class="btn-outline seed-btn" 
            @click="generateMocks" 
            :disabled="isGeneratingMocks"
          >
            <span v-if="isGeneratingMocks" class="spinner-small"></span>
            <span v-else>🧪 填充演示数据</span>
          </button>
          
          <button class="btn-primary" @click="handleCreateTask">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
            添加任务
          </button>
        </div>
      </header>

      <main class="gantt-container">
        <div v-if="taskStore.loading && taskStore.tasks.length === 0" class="loading-overlay">
          <div class="spinner"></div>
          <p>加载任务中...</p>
        </div>
        
        <GanttChart
          v-if="taskStore.tasks.length > 0"
          :tasks="taskStore.tasks"
          :view-mode="viewMode"
          :row-height="40"
          :show-today="true"
          @task-click="handleTaskClick"
          @task-dblclick="handleTaskDblclick"
        />
        
        <div v-if="!taskStore.loading && taskStore.tasks.length === 0" class="empty-gantt">
          <div class="empty-icon">📊</div>
          <h3>甘特图为空</h3>
          <p>这个项目还没有任何任务。点击右上角的"添加任务"，或者快速填充演示数据。</p>
        </div>
      </main>
    </template>
    
    <div v-else class="error-state">
      <h3>无法加载项目信息</h3>
      <button class="btn-primary" @click="goBack">返回列表</button>
    </div>

    <TaskEditDialog
      v-if="isEditing"
      :task="selectedTask"
      :members="users"
      :all-tasks="taskStore.tasks"
      @close="isEditing = false"
      @save="handleSaveTask"
      @delete="handleDeleteTask"
      @add-assignee="handleAddAssignee"
      @remove-assignee="handleRemoveAssignee"
    />
  </div>
</template>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: #f1f5f9;
  border: none;
  color: #475569;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.project-name {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.project-desc {
  font-size: 13px;
  color: #64748b;
}

.header-right {
  display: flex;
  gap: 12px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 10px -2px rgba(59, 130, 246, 0.3);
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gantt-container {
  flex: 1;
  padding: 24px 32px;
  overflow: hidden; /* Give over control to Gantt components inner wrapper */
  position: relative;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  inset: 24px 32px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #64748b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-gantt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-gantt h3 {
  font-size: 18px;
  color: #0f172a;
  margin-bottom: 8px;
}

.empty-gantt p {
  color: #64748b;
  font-size: 14px;
}
</style>
