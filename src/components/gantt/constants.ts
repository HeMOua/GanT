/**
 * 甘特图常量
 */
import type { TaskStatus } from './types'

// ─── 尺寸 ─────────────────────────────────────────────
export const DEFAULT_ROW_HEIGHT = 40
export const HEADER_HEIGHT = 56              // 双层头部总高度
export const HEADER_TOP_HEIGHT = 24          // 上层（月/年）
export const HEADER_BOTTOM_HEIGHT = 32       // 下层（日/周）
export const TASK_BAR_HEIGHT = 24
export const TASK_BAR_RADIUS = 4
export const MILESTONE_SIZE = 14
export const SUMMARY_BAR_HEIGHT = 8
export const SUMMARY_ARROW_SIZE = 5
export const TREE_PANEL_MIN_WIDTH = 200
export const TREE_PANEL_DEFAULT_WIDTH = 280
export const TREE_INDENT = 20
export const TREE_ICON_SIZE = 16
export const PROGRESS_BAR_HEIGHT = 24

// ─── 每种视图模式下每个单元格宽度 ──────────────────────
export const CELL_WIDTHS: Record<string, number> = {
  day: 40,
  week: 120,
  month: 200,
}

// ─── 颜色 ─────────────────────────────────────────────
export const COLORS = {
  // 状态颜色
  NOT_STARTED: '#909399',
  IN_PROGRESS: '#409EFF',
  DONE: '#67C23A',
  BLOCKED: '#F56C6C',

  // 通用
  DEFAULT_BAR: '#409EFF',
  PROGRESS_FILL: 'rgba(0,0,0,0.18)',
  CRITICAL_BORDER: '#E6394A',
  TODAY_LINE: '#E6394A',
  WEEKEND_BG: 'rgba(0,0,0,0.025)',
  GRID_LINE: 'rgba(0,0,0,0.06)',
  HEADER_BG: '#FAFBFC',
  HEADER_BORDER: '#E4E7ED',
  HEADER_TEXT: '#606266',
  TREE_BG: '#FFFFFF',
  TREE_HOVER: '#F5F7FA',
  TREE_BORDER: '#EBEEF5',
  TREE_TEXT: '#303133',
  TREE_TEXT_SECONDARY: '#909399',
  DEPENDENCY_LINE: '#909399',
  DEPENDENCY_ARROW: '#909399',
  TOOLTIP_BG: '#303133',
  TOOLTIP_TEXT: '#FFFFFF',
  ACTUAL_BAR_ALPHA: 0.35,
  SUMMARY_BAR: '#606266',
  MILESTONE: '#E6A23C',
  CANVAS_BG: '#FFFFFF',
  SCROLLBAR_THUMB: 'rgba(0,0,0,0.15)',
  SCROLLBAR_TRACK: 'rgba(0,0,0,0.04)',
  SPLITTER: '#DCDFE6',
  SPLITTER_HOVER: '#409EFF',

  // 暗色计划条（用于 actual vs planned）
  PLANNED_BAR_ALPHA: 0.3,
} as const

// ─── 状态 → 颜色 映射 ─────────────────────────────────
export const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: COLORS.NOT_STARTED,
  IN_PROGRESS: COLORS.IN_PROGRESS,
  DONE: COLORS.DONE,
  BLOCKED: COLORS.BLOCKED,
}

// ─── 负责人可视化 ──────────────────────────────────────
export const ASSIGNEE_SEGMENT_HEIGHT = 6       // 交接色带高度
export const ASSIGNEE_AVATAR_SIZE = 16         // Canvas 迷你头像直径
export const ASSIGNEE_AVATAR_FONT = 9          // 头像字号

/** 负责人调色盘（实色 HEX，Canvas 友好） */
export const ASSIGNEE_COLORS = [
  '#6366F1',   // Indigo
  '#10B981',   // Emerald
  '#F59E0B',   // Amber
  '#EF4444',   // Red
  '#8B5CF6',   // Violet
  '#EC4899',   // Pink
  '#14B8A6',   // Teal
  '#F97316',   // Orange
] as const

/** 负责人调色盘（渐变，DOM 用） */
export const ASSIGNEE_GRADIENTS = [
  'linear-gradient(135deg, #409EFF, #6366F1)',
  'linear-gradient(135deg, #67C23A, #10B981)',
  'linear-gradient(135deg, #E6A23C, #F59E0B)',
  'linear-gradient(135deg, #F56C6C, #EF4444)',
  'linear-gradient(135deg, #909399, #6B7280)',
  'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  'linear-gradient(135deg, #EC4899, #DB2777)',
  'linear-gradient(135deg, #14B8A6, #0D9488)',
] as const

// ─── 其他 ─────────────────────────────────────────────
export const MIN_VISIBLE_DAYS = 7
export const SCROLL_SPEED = 1.5
export const DEPENDENCY_LINE_WIDTH = 1.5
export const DEPENDENCY_ARROW_SIZE = 6
export const CRITICAL_BORDER_WIDTH = 2.5
