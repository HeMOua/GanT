<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useAuthStore } from '../stores/auth'
import type { Project } from '../api/projects'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const showCreateModal = ref(false)

// Form data for creating a project
const newProject = ref({
  name: '',
  description: '',
  start_date: '',
  end_date: ''
})

onMounted(async () => {
  await projectStore.fetchProjects()
})

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projectStore.projects
  const query = searchQuery.value.toLowerCase()
  return projectStore.projects.filter(p => 
    p.name.toLowerCase().includes(query) || 
    (p.description && p.description.toLowerCase().includes(query))
  )
})

function goToProject(id: number) {
  router.push(`/project/${id}`)
}

async function handleCreateProject() {
  if (!newProject.value.name) return
  
  const payload: Partial<Project> = {
    name: newProject.value.name,
    description: newProject.value.description || undefined,
    start_date: newProject.value.start_date || undefined,
    end_date: newProject.value.end_date || undefined,
  }
  
  await projectStore.createProject(payload)
  
  showCreateModal.value = false
  newProject.value = { name: '', description: '', start_date: '', end_date: '' }
}

function calculateProgress(project: Project) {
  if (!project.totalTasks || project.totalTasks === 0) return 0
  return Math.round(((project.doneTasks || 0) / project.totalTasks) * 100)
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '未设置'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="project-list-container">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">项目列表</h1>
        <p class="page-subtitle">管理所有的任务与团队进度</p>
      </div>
      
      <div class="header-actions">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" v-model="searchQuery" placeholder="搜索项目..." />
        </div>
        
        <button v-if="authStore.user?.role === 'ADMIN'" class="btn-primary" @click="showCreateModal = true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
          新建项目
        </button>
      </div>
    </header>

    <div v-if="projectStore.loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载项目数据...</p>
    </div>

    <div v-else-if="filteredProjects.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h3>没有找到项目</h3>
      <p>似乎这里还没有任何项目，或者没有匹配的搜索结果。</p>
      <button v-if="authStore.user?.role === 'ADMIN'" class="btn-outline" @click="showCreateModal = true">创建一个新项目</button>
    </div>

    <div v-else class="project-grid">
      <div 
        v-for="project in filteredProjects" 
        :key="project.id" 
        class="project-card"
        @click="goToProject(project.id)"
      >
        <div class="card-header">
          <h3 class="card-title">{{ project.name }}</h3>
          <span class="status-badge" :class="project.status.toLowerCase()">
            {{ project.status === 'ACTIVE' ? '进行中' : '已归档' }}
          </span>
        </div>
        
        <p class="card-description">{{ project.description || '暂无描述' }}</p>
        
        <div class="card-metrics">
          <div class="metric">
            <span class="metric-label">总任务</span>
            <span class="metric-value">{{ project.totalTasks || 0 }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">已完成</span>
            <span class="metric-value highlight">{{ project.doneTasks || 0 }}</span>
          </div>
          <div class="metric dates">
            <span class="metric-label">周期</span>
            <span class="metric-value text-sm">{{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">整体进度</span>
            <span class="progress-percent">{{ calculateProgress(project) }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" :style="{ width: `${calculateProgress(project)}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @mousedown.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>新建项目</h2>
          <button class="close-btn" @click="showCreateModal = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form @submit.prevent="handleCreateProject" class="modal-body">
          <div class="form-group">
            <label>项目名称 <span class="required">*</span></label>
            <input type="text" v-model="newProject.name" required placeholder="例如：新电商平台重构" />
          </div>
          
          <div class="form-group">
            <label>项目描述</label>
            <textarea v-model="newProject.description" placeholder="关于这个项目的详细信息..." rows="3"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>开始日期</label>
              <input type="date" v-model="newProject.start_date" />
            </div>
            <div class="form-group">
              <label>结束日期</label>
              <input type="date" v-model="newProject.end_date" />
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="!newProject.name">创建项目</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-list-container {
  padding: 32px 40px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.page-subtitle {
  color: #64748b;
  font-size: 15px;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-box {
  position: relative;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-box input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
}

.search-box input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  color: white;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -2px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px -2px rgba(59, 130, 246, 0.3), 0 4px 6px -3px rgba(59, 130, 246, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

/* 列表展示 */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.project-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.project-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  border-color: #e2e8f0;
}

.project-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
}

.status-badge.active {
  background: #ecfdf5;
  color: #059669;
}

.card-description {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 24px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-metrics {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric.dates {
  margin-left: auto;
  align-items: flex-end;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.metric-value.highlight {
  color: #3b82f6;
}

.metric-value.text-sm {
  font-size: 13px;
  font-weight: 600;
}

.progress-section {
  margin-top: auto;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.progress-label {
  color: #475569;
}

.progress-percent {
  color: #0f172a;
}

.progress-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 空状态 & 加载区 */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-state h3 {
  font-size: 20px;
  color: #0f172a;
  margin-bottom: 8px;
}

.empty-state p {
  color: #64748b;
  margin-bottom: 24px;
  max-width: 300px;
}

/* Modal 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 24px 32px;
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

.required {
  color: #ef4444;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  background: #fff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

.btn-cancel {
  background: transparent;
  border: none;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  color: #1e293b;
}
</style>
