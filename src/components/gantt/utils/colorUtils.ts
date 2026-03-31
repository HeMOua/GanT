/**
 * 颜色工具函数
 */
import type { GanttTask, TaskStatus } from '../types'
import { COLORS, STATUS_COLORS, ASSIGNEE_COLORS, ASSIGNEE_GRADIENTS } from '../constants'

/**
 * 获取任务条颜色
 * 优先级：自定义 color > status 映射 > 默认颜色
 */
export function getTaskBarColor(task: GanttTask): string {
  if (task.color) return task.color
  if (task.status) return STATUS_COLORS[task.status]
  return COLORS.DEFAULT_BAR
}

/**
 * 获取进度条填充颜色（比主色深一点）
 */
export function getProgressColor(baseColor: string): string {
  return adjustBrightness(baseColor, -20)
}

/**
 * 为 actual_time 条生成半透明版本
 */
export function getPlannedBarColor(baseColor: string): string {
  return hexToRgba(baseColor, COLORS.PLANNED_BAR_ALPHA)
}

/**
 * 状态对应的标签文本
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    BLOCKED: '已阻塞',
  }
  return labels[status]
}

// ─── 负责人颜色 ──────────────────────────────────────

/** 根据名字 hash 返回固定的 HEX 颜色（Canvas 用） */
export function getAssigneeColor(name: string): string {
  return ASSIGNEE_COLORS[nameHash(name) % ASSIGNEE_COLORS.length]!
}

/** 根据名字 hash 返回固定的 CSS 渐变（DOM 用） */
export function getAssigneeGradient(name: string): string {
  return ASSIGNEE_GRADIENTS[nameHash(name) % ASSIGNEE_GRADIENTS.length]!
}

function nameHash(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

// ─── 内部工具函数 ─────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function adjustBrightness(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  r = Math.max(0, Math.min(255, r + amount))
  g = Math.max(0, Math.min(255, g + amount))
  b = Math.max(0, Math.min(255, b + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

