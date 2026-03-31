<script setup lang="ts">
/**
 * App.vue - 甘特图组件使用示例
 *
 * 演示全部功能：
 * - 层级结构（项目 → 阶段 → 任务）
 * - 进度 + 状态
 * - 依赖关系（FS/SS/FF + lag）
 * - 里程碑
 * - 实际时间 vs 计划时间
 * - 关键路径高亮
 * - 自定义颜色
 */
import { ref } from 'vue'
import { GanttChart } from './components/gantt'
import type { GanttTask, ViewMode } from './components/gantt'

const viewMode = ref<ViewMode>('day')

// ─── 完整示例数据 ────────────────────────────────────
const tasks = ref<GanttTask[]>([
  // ====== 项目根节点 ======
  {
    id: 1,
    name: '智能管理系统 v2.0',
    start_time: '2026-04-01',
    end_time: '2026-05-20',
    parent_id: null,
    progress: 35,
    status: 'IN_PROGRESS',
    order: 1,
  },

  // ====== 第一阶段：需求分析 ======
  {
    id: 10,
    name: '需求分析',
    start_time: '2026-04-01',
    end_time: '2026-04-10',
    parent_id: 1,
    progress: 100,
    status: 'DONE',
    order: 1,
  },
  {
    id: 101,
    name: '用户调研',
    start_time: '2026-04-01',
    end_time: '2026-04-04',
    parent_id: 10,
    progress: 100,
    status: 'DONE',
    order: 1,
    assignees: [{ name: '张伟' }],
  },
  {
    id: 102,
    name: '需求文档编写',
    start_time: '2026-04-04',
    end_time: '2026-04-08',
    parent_id: 10,
    progress: 100,
    status: 'DONE',
    dependencies: [{ task_id: 101, type: 'FS', lag: 0 }],
    order: 2,
    assignees: [{ name: '李娜', role: '主笔' }, { name: '张伟', role: '协助' }],
  },
  {
    id: 103,
    name: '需求评审会议',
    start_time: '2026-04-09',
    end_time: '2026-04-09',
    parent_id: 10,
    is_milestone: true,
    status: 'DONE',
    progress: 100,
    dependencies: [{ task_id: 102, type: 'FS', lag: 1 }],
    order: 3,
    color: '#E6A23C',
    assignees: [{ name: '王强' }],
  },

  // ====== 第二阶段：设计 ======
  {
    id: 20,
    name: 'UI/UX 设计',
    start_time: '2026-04-10',
    end_time: '2026-04-20',
    parent_id: 1,
    progress: 80,
    status: 'IN_PROGRESS',
    order: 2,
  },
  {
    id: 201,
    name: '原型设计',
    start_time: '2026-04-10',
    end_time: '2026-04-14',
    parent_id: 20,
    progress: 100,
    status: 'DONE',
    dependencies: [{ task_id: 103, type: 'FS', lag: 0 }],
    order: 1,
    assignees: [{ name: '赵敏' }],
  },
  {
    id: 202,
    name: '视觉设计',
    start_time: '2026-04-14',
    end_time: '2026-04-18',
    parent_id: 20,
    progress: 70,
    status: 'IN_PROGRESS',
    dependencies: [{ task_id: 201, type: 'FS', lag: 0 }],
    actual_start_time: '2026-04-15',
    actual_end_time: '2026-04-20',
    order: 2,
    is_critical: true,
    // 交接示例：赵敏完成前半部分，周杰接手后半部分
    assignees: [
      { name: '赵敏', from: '2026-04-14', to: '2026-04-16', role: '主设计' },
      { name: '周杰', from: '2026-04-16', to: '2026-04-18', role: '接手完成' },
    ],
  },
  {
    id: 203,
    name: '设计评审',
    start_time: '2026-04-20',
    end_time: '2026-04-20',
    parent_id: 20,
    is_milestone: true,
    status: 'NOT_STARTED',
    dependencies: [{ task_id: 202, type: 'FS', lag: 0 }],
    order: 3,
  },

  // ====== 第三阶段：开发 ======
  {
    id: 30,
    name: '前后端开发',
    start_time: '2026-04-21',
    end_time: '2026-05-10',
    parent_id: 1,
    progress: 15,
    status: 'IN_PROGRESS',
    order: 3,
  },
  {
    id: 301,
    name: '后端 API 开发',
    start_time: '2026-04-21',
    end_time: '2026-05-02',
    parent_id: 30,
    progress: 30,
    status: 'IN_PROGRESS',
    dependencies: [{ task_id: 203, type: 'FS', lag: 0 }],
    order: 1,
    is_critical: true,
    assignees: [{ name: '陈超', role: '开发' }, { name: '刘洋', role: 'DBA' }],
  },
  {
    id: 302,
    name: '前端页面开发',
    start_time: '2026-04-21',
    end_time: '2026-05-05',
    parent_id: 30,
    progress: 20,
    status: 'IN_PROGRESS',
    dependencies: [
      { task_id: 203, type: 'FS', lag: 0 },
      { task_id: 301, type: 'SS', lag: 0 },
    ],
    order: 2,
    // 多人协作示例
    assignees: [
      { name: '张伟', role: '页面开发' },
      { name: '赵敏', role: '样式实现' },
      { name: '周杰', role: '组件开发' },
    ],
  },
  {
    id: 303,
    name: '数据库设计',
    start_time: '2026-04-21',
    end_time: '2026-04-25',
    parent_id: 30,
    progress: 100,
    status: 'DONE',
    dependencies: [{ task_id: 203, type: 'FS', lag: 0 }],
    order: 3,
    color: '#67C23A',
    assignees: [{ name: '刘洋' }],
  },
  {
    id: 304,
    name: '前后端联调',
    start_time: '2026-05-05',
    end_time: '2026-05-10',
    parent_id: 30,
    progress: 0,
    status: 'NOT_STARTED',
    dependencies: [
      { task_id: 301, type: 'FF', lag: 0 },
      { task_id: 302, type: 'FS', lag: 0 },
    ],
    order: 4,
    is_critical: true,
    assignees: [{ name: '陈超', role: '后端' }, { name: '张伟', role: '前端' }],
  },

  // ====== 第四阶段：测试 ======
  {
    id: 40,
    name: '测试 & QA',
    start_time: '2026-05-10',
    end_time: '2026-05-18',
    parent_id: 1,
    progress: 0,
    status: 'NOT_STARTED',
    order: 4,
  },
  {
    id: 401,
    name: '单元测试',
    start_time: '2026-05-10',
    end_time: '2026-05-13',
    parent_id: 40,
    progress: 0,
    status: 'NOT_STARTED',
    dependencies: [{ task_id: 304, type: 'FS', lag: 0 }],
    order: 1,
    assignees: [{ name: '孙丽' }],
  },
  {
    id: 402,
    name: '集成测试',
    start_time: '2026-05-13',
    end_time: '2026-05-16',
    parent_id: 40,
    progress: 0,
    status: 'NOT_STARTED',
    dependencies: [{ task_id: 401, type: 'FS', lag: 0 }],
    order: 2,
    assignees: [{ name: '孙丽' }],
  },
  {
    id: 403,
    name: 'Bug 修复',
    start_time: '2026-05-16',
    end_time: '2026-05-18',
    parent_id: 40,
    progress: 0,
    status: 'BLOCKED',
    dependencies: [{ task_id: 402, type: 'FS', lag: 0 }],
    order: 3,
    color: '#F56C6C',
    assignees: [
      { name: '陈超', from: '2026-05-16', to: '2026-05-17', role: '后端Bug' },
      { name: '张伟', from: '2026-05-17', to: '2026-05-18', role: '前端Bug' },
    ],
  },

  // ====== 里程碑：上线 ======
  {
    id: 50,
    name: '🚀 正式上线',
    start_time: '2026-05-20',
    end_time: '2026-05-20',
    parent_id: 1,
    is_milestone: true,
    status: 'NOT_STARTED',
    dependencies: [{ task_id: 403, type: 'FS', lag: 2 }],
    order: 5,
    is_critical: true,
    color: '#E6394A',
  },
])

function handleTaskClick(task: GanttTask) {
  console.log('Task clicked:', task.name, task)
}

function handleTaskDblclick(task: GanttTask) {
  console.log('Task double-clicked:', task.name, task)
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">
        <span class="app-title__icon">📊</span>
        甘特图控件演示
      </h1>
      <p class="app-subtitle">支持层级、进度、依赖、里程碑、关键路径、实际/计划对比</p>
    </header>

    <main class="app-main">
      <GanttChart
        :tasks="tasks"
        :view-mode="viewMode"
        :row-height="40"
        :show-today="true"
        @task-click="handleTaskClick"
        @task-dblclick="handleTaskDblclick"
      />
    </main>
  </div>
</template>

<style>
/* ─── 全局基础样式 ───────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: #F0F2F5;
  color: #303133;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 24px;
  gap: 16px;
}

.app-header {
  flex-shrink: 0;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: #1D2129;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title__icon {
  font-size: 26px;
}

.app-subtitle {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.app-main {
  flex: 1;
  min-height: 0;
}
</style>
