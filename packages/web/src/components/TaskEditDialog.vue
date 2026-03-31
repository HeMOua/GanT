<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  task: any | null
  members: any[]
  allTasks: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
  (e: 'delete', id: number): void
  (e: 'add-assignee', taskId: number, userId: number): void
  (e: 'remove-assignee', taskId: number, assigneeId: number): void
}>()

const newAssigneeId = ref<number | ''>('')

const availableUsers = computed(() => {
  if (!props.task || !props.task.assignees) return props.members
  const assignedUserIds = props.task.assignees.map((a: any) => a.user_id)
  return props.members.filter((m: any) => !assignedUserIds.includes(m.id))
})

function handleAddAssignee() {
  if (newAssigneeId.value && props.task) {
    emit('add-assignee', props.task.id, newAssigneeId.value as number)
    newAssigneeId.value = ''
  }
}

const formData = ref({
  name: '',
  start_time: '',
  end_time: '',
  progress: 0,
  status: 'NOT_STARTED',
  is_milestone: false,
  is_critical: false,
  color: '',
  parent_id: null as number | null
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'ADMIN')
const isAssignee = computed(() => {
  if (!props.task || !props.task.assignees) return false
  return props.task.assignees.some((a: any) => a.user_id === authStore.user?.id)
})
const canEditProgress = computed(() => isAdmin.value || isAssignee.value)

onMounted(() => {
  if (props.task) {
    formData.value = {
      name: props.task.name,
      start_time: props.task.start_time,
      end_time: props.task.end_time,
      progress: props.task.progress || 0,
      status: props.task.status || 'NOT_STARTED',
      is_milestone: props.task.is_milestone || false,
      is_critical: props.task.is_critical || false,
      color: props.task.color || '',
      parent_id: props.task.parent_id || null
    }
  } else {
    // defaults for new task
    const today = new Date().toISOString().split('T')[0] as string
    formData.value.start_time = today
    formData.value.end_time = today
  }
})

function submit() {
  emit('save', {
    ...formData.value,
    color: formData.value.color || undefined // remove empty string
  })
}
</script>

<template>
  <div class="modal-overlay" @mousedown.self="emit('close')">
    <div class="modal-content slider-panel">
      <div class="modal-header">
        <h2>{{ task ? '编辑任务' : '添加新任务' }}</h2>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <div class="modal-body">
        <form id="task-form" @submit.prevent="submit">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>
            <div class="form-group content-full">
              <label>任务名称</label>
              <input type="text" v-model="formData.name" required placeholder="输入引人注目的任务标题..." :disabled="!isAdmin" />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>开始时间</label>
                <input type="date" v-model="formData.start_time" required :disabled="!isAdmin" />
              </div>
              <div class="form-group">
                <label>结束时间</label>
                <input type="date" v-model="formData.end_time" required :disabled="!isAdmin" />
              </div>
            </div>
          </div>
          
          <!-- 状态与进度 -->
          <div class="form-section">
            <h3 class="section-title">状态与配置</h3>
            <div class="form-row">
              <div class="form-group">
                <label>当前状态</label>
                <select v-model="formData.status" :disabled="!canEditProgress">
                  <option value="NOT_STARTED">未开始</option>
                  <option value="IN_PROGRESS">进行中</option>
                  <option value="DONE">已完成</option>
                  <option value="BLOCKED">阻塞中</option>
                </select>
              </div>
              <div class="form-group">
                <label>完成进度 ({{ formData.progress }}%)</label>
                <input type="range" v-model.number="formData.progress" min="0" max="100" class="range-slider" :disabled="!canEditProgress" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>父任务</label>
                <select v-model="formData.parent_id" :disabled="!isAdmin">
                  <option :value="null">-- 无 (根任务) --</option>
                  <option 
                    v-for="t in allTasks.filter(x => !task || x.id !== task.id)" 
                    :key="t.id" 
                    :value="t.id"
                  >
                    {{ t.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>自定义高亮色</label>
                <div class="color-picker-wrapper" :class="{ disabled: !isAdmin }">
                  <input type="color" v-model="formData.color" :disabled="!isAdmin" />
                  <span class="color-val">{{ formData.color || '默认' }}</span>
                  <button type="button" v-if="formData.color && isAdmin" @click="formData.color = ''" class="clear-color">清除</button>
                </div>
              </div>
            </div>

            <div class="toggles">
              <label class="toggle-control" :class="{ disabled: !isAdmin }">
                <input type="checkbox" v-model="formData.is_milestone" :disabled="!isAdmin" />
                <span class="control-indicator"></span>
                标记为里程碑
              </label>
              <label class="toggle-control alert" :class="{ disabled: !isAdmin }">
                <input type="checkbox" v-model="formData.is_critical" :disabled="!isAdmin" />
                <span class="control-indicator"></span>
                标记为关键任务
              </label>
            </div>
          </div>
          
          <!-- 人员分配 -->
          <div class="form-section">
            <h3 class="section-title">负责人分配</h3>
            <div v-if="task && task.assignees && task.assignees.length > 0" class="assignee-list">
              <div v-for="assignee in task.assignees" :key="assignee.id" class="assignee-item">
                <span class="assignee-name">{{ members.find(m => m.id === assignee.user_id)?.display_name || members.find(m => m.id === assignee.user_id)?.username || '未知成员' }}</span>
                <button v-if="isAdmin" type="button" class="btn-remove-assignee" @click.prevent="emit('remove-assignee', task.id, assignee.id)">✕</button>
              </div>
            </div>
            
            <div v-if="task && isAdmin" class="add-assignee-form">
              <select v-model="newAssigneeId" class="assignee-select" :disabled="availableUsers.length === 0">
                <option value="" disabled>{{ availableUsers.length > 0 ? '选择成员...' : '暂无可用成员' }}</option>
                <option v-for="u in availableUsers" :key="u.id" :value="u.id">{{ u.display_name || u.username }}</option>
              </select>
              <button type="button" class="btn-primary btn-sm" @click.prevent="handleAddAssignee" :disabled="!newAssigneeId">指派</button>
            </div>
            <div v-else-if="!task && isAdmin" class="add-assignee-hint">
              <p>请先保存新建的任务，然后再分配负责人。</p>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <div class="left-actions">
          <button v-if="task && isAdmin" type="button" class="btn-danger" @click="emit('delete', task.id)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            删除任务
          </button>
        </div>
        <div class="right-actions">
          <button type="button" class="btn-cancel" @click="emit('close')">取消</button>
          <button type="submit" form="task-form" class="btn-primary" v-if="canEditProgress">保存修​​改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slider-panel {
  background: #ffffff;
  width: 100%;
  max-width: 460px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px 16px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
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
  padding: 6px;
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
  flex: 1;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.form-group {
  margin-bottom: 20px;
}

.content-full {
  width: 100%;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="date"],
.form-group select {
  width: 100%;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
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
  min-width: 0;
}

.range-slider {
  width: 100%;
  margin-top: 10px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 10px;
}

.color-picker-wrapper input[type="color"] {
  border: none;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.color-val {
  font-size: 13px;
  color: #64748b;
  flex: 1;
}

.clear-color {
  font-size: 12px;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
}

.toggles {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
}

.toggle-control.alert {
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.right-actions {
  display: flex;
  gap: 12px;
}

.btn-primary {
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

.btn-cancel {
  background: transparent;
  border: none;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: #ef4444;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

/* Assignee styles */
.assignee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.assignee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.assignee-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.btn-remove-assignee {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove-assignee:hover {
  color: #ef4444;
}

.add-assignee-form {
  display: flex;
  gap: 12px;
}

.assignee-select {
  flex: 1;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.btn-sm {
  padding: 8px 16px;
}

.add-assignee-hint {
  font-size: 13px;
  color: #64748b;
  font-style: italic;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
}
</style>
