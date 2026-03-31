/**
 * 甘特图类型定义
 */

// ─── 依赖关系 ───────────────────────────────────────────
export type DependencyType = 'FS' | 'SS' | 'FF'

export interface GanttDependency {
  task_id: number
  type: DependencyType
  lag: number
}

// ─── 任务负责人 ─────────────────────────────────────────
export interface TaskAssignee {
  name: string
  from?: string              // 'YYYY-MM-DD' 负责开始时间（可选，缺省=任务start_time）
  to?: string                // 'YYYY-MM-DD' 负责结束时间（可选，缺省=任务end_time）
  role?: string              // 角色描述，如 '开发', '评审' 等（可选）
}

// ─── 任务状态 ───────────────────────────────────────────
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'

// ─── 任务数据（用户传入） ────────────────────────────────
export interface GanttTask {
  // 阶段1：最小可用
  id: number
  name: string
  start_time: string          // 'YYYY-MM-DD'
  end_time: string            // 'YYYY-MM-DD'
  parent_id: number | null

  // 阶段2：实用
  progress?: number           // 0~100
  dependencies?: GanttDependency[]

  // 阶段3：专业
  status?: TaskStatus
  actual_start_time?: string
  actual_end_time?: string
  is_milestone?: boolean
  color?: string
  order?: number
  assignees?: TaskAssignee[]   // 负责人列表（支持多人 + 交接）

  // 阶段4：工程级
  is_critical?: boolean
  duration?: number
}

// ─── 视图模式 ───────────────────────────────────────────
export type ViewMode = 'day' | 'week' | 'month'

// ─── 内部：带层级信息的扁平化任务 ─────────────────────────
export interface FlattenedTask {
  task: GanttTask
  level: number          // 层级深度
  hasChildren: boolean   // 是否有子节点
  expanded: boolean      // 是否展开
  visible: boolean       // 是否可见（父级未折叠）
}

// ─── 时间轴单元格 ──────────────────────────────────────
export interface TimelineCell {
  date: Date
  label: string
  x: number
  width: number
  isWeekend: boolean
  isToday: boolean
}

export interface TimelineGroup {
  label: string
  x: number
  width: number
}

// ─── Tooltip 数据 ──────────────────────────────────────
export interface TooltipData {
  task: GanttTask
  x: number
  y: number
}

// ─── Props ─────────────────────────────────────────────
export interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: ViewMode
  rowHeight?: number
  showToday?: boolean
}
