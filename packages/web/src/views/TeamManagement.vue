<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api/client'

const users = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const newUser = ref({ username: '', display_name: '', password: '', role: 'USER' })

async function loadUsers() {
  loading.value = true
  try {
    const res = await api.get('/users')
    users.value = res.data
  } catch (e) {
    console.error('Failed to load users', e)
    alert('加载用户失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsers()
})

async function handleAddUser() {
  try {
    await api.post('/users', newUser.value)
    showAddModal.value = false
    newUser.value = { username: '', display_name: '', password: '', role: 'USER' }
    await loadUsers()
  } catch (e: any) {
    alert(e.response?.data?.message || '添加失败')
  }
}

async function toggleRole(user: any) {
  const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
  if (confirm(`确定要将 ${user.display_name} 的角色改为 ${newRole === 'ADMIN' ? '管理员' : '普通用户'} 吗？`)) {
    try {
      await api.patch(`/users/${user.id}/role`, { role: newRole })
      user.role = newRole
    } catch (e) {
      alert('更新角色失败')
    }
  }
}
</script>

<template>
  <div class="team-container">
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">团队管理</h1>
        <p class="page-subtitle">管理所有团队成员及其权限</p>
      </div>
      
      <button class="btn-primary" @click="showAddModal = true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
        添加成员
      </button>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载收集中...</p>
    </div>

    <div v-else class="user-list">
      <table class="data-table">
        <thead>
          <tr>
            <th>成员</th>
            <th>账号ID</th>
            <th>角色 / 权限</th>
            <th>加入时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <div class="user-cell">
                <div class="avatar">{{ user.username?.charAt(0).toUpperCase() || 'U' }}</div>
                <span class="display-name">{{ user.display_name || user.username }}</span>
              </div>
            </td>
            <td><span class="text-sm code-text">{{ user.username }}</span></td>
            <td>
              <span class="role-badge" :class="user.role.toLowerCase()">
                {{ user.role === 'ADMIN' ? '管理员 (Admin)' : '普通用户 (User)' }}
              </span>
            </td>
            <td><span class="text-sm date-text">{{ new Date(user.created_at).toLocaleDateString() }}</span></td>
            <td>
              <button 
                class="btn-text secondary" 
                @click="toggleRole(user)"
              >
                切换角色
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加成员弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @mousedown.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>添加新成员</h2>
          <button class="close-btn" @click="showAddModal = false">关闭</button>
        </div>
        
        <form @submit.prevent="handleAddUser" class="modal-body">
          <div class="form-group">
            <label>登录账号 <span class="required">*</span></label>
            <input type="text" v-model="newUser.username" required placeholder="用于登录的账号 ID" />
          </div>
          
          <div class="form-group">
            <label>显示名称 <span class="required">*</span></label>
            <input type="text" v-model="newUser.display_name" required placeholder="如：张伟" />
          </div>
          
          <div class="form-group">
            <label>初始密码</label>
            <input type="text" v-model="newUser.password" placeholder="留空则默认为 123456" />
          </div>
          
          <div class="form-group">
            <label>系统角色</label>
            <select v-model="newUser.role" class="form-select">
              <option value="USER">普通用户 (参与项目)</option>
              <option value="ADMIN">管理员 (管理全局)</option>
            </select>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="showAddModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="!newUser.username || !newUser.display_name">添加成员</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.team-container {
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
}

.page-subtitle {
  color: #64748b;
  font-size: 15px;
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
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}

.icon {
  width: 20px;
  height: 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60px;
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

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.data-table th, .data-table td {
  padding: 16px 20px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.display-name {
  font-weight: 600;
  color: #1e293b;
}

.code-text {
  font-family: monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.text-sm {
  font-size: 14px;
  color: #64748b;
}

.role-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #f1f5f9;
  color: #64748b;
  display: inline-block;
}

.role-badge.admin {
  background: #fee2e2;
  color: #ef4444;
}

.role-badge.user {
  background: #e0f2fe;
  color: #0ea5e9;
}

.btn-text {
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-text.secondary {
  color: #64748b;
}
.btn-text.secondary:hover {
  color: #0f172a;
  text-decoration: underline;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 460px;
  overflow: hidden;
}

.modal-header {
  padding: 24px 32px 16px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h2 {
  font-size: 20px;
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
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

.form-group input, .form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
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
  padding: 10px 20px;
  cursor: pointer;
  color: #64748b;
  font-weight: 600;
}
</style>
