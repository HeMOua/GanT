/**
 * useCanvasRenderer - Canvas 绘制逻辑
 *
 * 职责：
 * 1. 绘制网格线和背景
 * 2. 绘制任务条（普通/里程碑/父任务摘要）
 * 3. 绘制进度填充
 * 4. 绘制实际 vs 计划双层条
 * 5. 绘制关键路径高亮
 */
import type { FlattenedTask, ViewMode, TaskAssignee } from '../types'
import {
  DEFAULT_ROW_HEIGHT,
  TASK_BAR_HEIGHT,
  TASK_BAR_RADIUS,
  MILESTONE_SIZE,
  SUMMARY_BAR_HEIGHT,
  SUMMARY_ARROW_SIZE,
  COLORS,
  CRITICAL_BORDER_WIDTH,
  ASSIGNEE_SEGMENT_HEIGHT,
  ASSIGNEE_AVATAR_SIZE,
  ASSIGNEE_AVATAR_FONT,
} from '../constants'
import { parseDate } from '../utils/dateUtils'
import { getTaskBarColor, getPlannedBarColor, getAssigneeColor } from '../utils/colorUtils'

interface RendererOptions {
  ctx: CanvasRenderingContext2D
  visibleTasks: FlattenedTask[]
  rowHeight: number
  totalWidth: number
  totalHeight: number
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  dateToX: (date: Date | string) => number
  todayX: number
  showToday: boolean
  viewMode: ViewMode
  cells: { x: number; width: number; isWeekend: boolean; isToday: boolean }[]
}

export function renderGanttCanvas(options: RendererOptions) {
  const {
    ctx,
    visibleTasks,
    rowHeight,
    totalWidth,
    totalHeight,
    scrollX,
    scrollY,
    canvasWidth,
    canvasHeight,
    dateToX,
    todayX,
    showToday,
    cells,
  } = options

  const dpr = window.devicePixelRatio || 1
  ctx.save()
  ctx.scale(dpr, dpr)

  // 清除画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.fillStyle = COLORS.CANVAS_BG
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 裁剪区域
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, canvasWidth, canvasHeight)
  ctx.clip()

  // 平移到滚动位置
  ctx.translate(-scrollX, -scrollY)

  // 1. 绘制背景（周末 + 网格线）
  drawBackground(ctx, cells, totalHeight, scrollX, canvasWidth, rowHeight, visibleTasks.length)

  // 2. 绘制今日线
  if (showToday) {
    drawTodayLine(ctx, todayX, totalHeight)
  }

  // 3. 绘制任务条
  for (let i = 0; i < visibleTasks.length; i++) {
    const ft = visibleTasks[i]
    if (!ft) continue
    const y = i * rowHeight
    // 只绘制可视区域内的任务
    if (y + rowHeight < scrollY || y > scrollY + canvasHeight) continue
    drawTaskBar(ctx, ft, y, rowHeight, dateToX)
  }

  ctx.restore()
  ctx.restore()
}

// ─── 背景 ─────────────────────────────────────────────
function drawBackground(
  ctx: CanvasRenderingContext2D,
  cells: RendererOptions['cells'],
  totalHeight: number,
  scrollX: number,
  canvasWidth: number,
  rowHeight: number,
  rowCount: number,
) {
  // 周末背景
  for (const cell of cells) {
    if (cell.x + cell.width < scrollX || cell.x > scrollX + canvasWidth) continue
    if (cell.isWeekend) {
      ctx.fillStyle = COLORS.WEEKEND_BG
      ctx.fillRect(cell.x, 0, cell.width, totalHeight)
    }
  }

  // 垂直网格线
  ctx.strokeStyle = COLORS.GRID_LINE
  ctx.lineWidth = 1
  for (const cell of cells) {
    if (cell.x + cell.width < scrollX || cell.x > scrollX + canvasWidth) continue
    ctx.beginPath()
    ctx.moveTo(cell.x + cell.width, 0)
    ctx.lineTo(cell.x + cell.width, totalHeight)
    ctx.stroke()
  }

  // 水平网格线
  for (let i = 0; i <= rowCount; i++) {
    const y = i * rowHeight
    ctx.beginPath()
    ctx.moveTo(scrollX, y)
    ctx.lineTo(scrollX + canvasWidth, y)
    ctx.stroke()
  }
}

// ─── 今日线 ───────────────────────────────────────────
function drawTodayLine(ctx: CanvasRenderingContext2D, todayX: number, totalHeight: number) {
  ctx.save()
  ctx.strokeStyle = COLORS.TODAY_LINE
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(todayX, 0)
  ctx.lineTo(todayX, totalHeight)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ─── 任务条 ───────────────────────────────────────────
function drawTaskBar(
  ctx: CanvasRenderingContext2D,
  ft: FlattenedTask,
  y: number,
  rowHeight: number,
  dateToX: (date: Date | string) => number,
) {
  const task = ft.task
  const barColor = getTaskBarColor(task)
  const barY = y + (rowHeight - TASK_BAR_HEIGHT) / 2

  // 里程碑
  if (task.is_milestone) {
    drawMilestone(ctx, dateToX(task.start_time), barY + TASK_BAR_HEIGHT / 2, barColor, task.is_critical)
    return
  }

  const startX = dateToX(task.start_time)
  const endX = dateToX(task.end_time)
  const barWidth = Math.max(endX - startX, 6) // 最小宽度6px

  // 父任务摘要条
  if (ft.hasChildren) {
    drawSummaryBar(ctx, startX, y + rowHeight / 2 - SUMMARY_BAR_HEIGHT / 2, barWidth)
    return
  }

  // 实际时间 vs 计划时间（双层条）
  if (task.actual_start_time && task.actual_end_time) {
    const actualStartX = dateToX(task.actual_start_time)
    const actualEndX = dateToX(task.actual_end_time)
    const actualWidth = Math.max(actualEndX - actualStartX, 6)

    // 计划条（上半，半透明）
    const plannedBarY = barY
    const halfHeight = TASK_BAR_HEIGHT / 2 - 1
    ctx.fillStyle = getPlannedBarColor(barColor)
    roundRect(ctx, startX, plannedBarY, barWidth, halfHeight, TASK_BAR_RADIUS)
    ctx.fill()

    // 实际条（下半，实色）
    const actualBarY = barY + TASK_BAR_HEIGHT / 2 + 1
    ctx.fillStyle = barColor
    roundRect(ctx, actualStartX, actualBarY, actualWidth, halfHeight, TASK_BAR_RADIUS)
    ctx.fill()
  } else {
    // 普通单层条
    ctx.fillStyle = barColor
    roundRect(ctx, startX, barY, barWidth, TASK_BAR_HEIGHT, TASK_BAR_RADIUS)
    ctx.fill()

    // 进度填充
    if (task.progress !== undefined && task.progress > 0) {
      const progressWidth = barWidth * (task.progress / 100)
      ctx.save()
      roundRect(ctx, startX, barY, barWidth, TASK_BAR_HEIGHT, TASK_BAR_RADIUS)
      ctx.clip()
      ctx.fillStyle = COLORS.PROGRESS_FILL
      // 从右侧覆盖未完成部分（或从左侧填充深色进度）
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(startX + progressWidth, barY, barWidth - progressWidth, TASK_BAR_HEIGHT)
      ctx.restore()

      // 进度文本
      if (barWidth > 40) {
        ctx.save()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '11px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(
          `${task.progress}%`,
          startX + barWidth / 2,
          barY + TASK_BAR_HEIGHT / 2,
        )
        ctx.restore()
      }
    }

    // BLOCKED 虚线边框
    if (task.status === 'BLOCKED') {
      ctx.save()
      ctx.strokeStyle = barColor
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      roundRect(ctx, startX, barY, barWidth, TASK_BAR_HEIGHT, TASK_BAR_RADIUS)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  // 关键路径高亮
  if (task.is_critical) {
    ctx.save()
    ctx.strokeStyle = COLORS.CRITICAL_BORDER
    ctx.lineWidth = CRITICAL_BORDER_WIDTH
    roundRect(ctx, startX - 1, barY - 1, barWidth + 2, TASK_BAR_HEIGHT + 2, TASK_BAR_RADIUS + 1)
    ctx.stroke()
    ctx.restore()
  }

  // ─── 负责人可视化 ─────────────────────────────────
  if (task.assignees && task.assignees.length > 0) {
    const hasTimeRanges = task.assignees.some(a => a.from || a.to)
    if (hasTimeRanges) {
      drawAssigneeSegments(ctx, task.assignees, startX, barY, barWidth, dateToX, task.start_time, task.end_time)
    } else {
      drawAssigneeAvatars(ctx, task.assignees, startX + barWidth, barY)
    }
  }

  // 任务名标签（条右侧）
  const labelOffsetX = (task.assignees && task.assignees.length > 0 && !task.assignees.some(a => a.from || a.to))
    ? task.assignees.length * (ASSIGNEE_AVATAR_SIZE - 4) + 10
    : 6
  if (barWidth < 60) {
    ctx.save()
    ctx.fillStyle = COLORS.HEADER_TEXT
    ctx.font = '12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(task.name, startX + barWidth + labelOffsetX, barY + TASK_BAR_HEIGHT / 2)
    ctx.restore()
  }
}

// ─── 里程碑 ───────────────────────────────────────────
function drawMilestone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  isCritical?: boolean,
) {
  const size = MILESTONE_SIZE / 2
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.lineTo(cx + size, cy)
  ctx.lineTo(cx, cy + size)
  ctx.lineTo(cx - size, cy)
  ctx.closePath()
  ctx.fill()

  if (isCritical) {
    ctx.strokeStyle = COLORS.CRITICAL_BORDER
    ctx.lineWidth = CRITICAL_BORDER_WIDTH
    ctx.stroke()
  }
  ctx.restore()
}

// ─── 父任务摘要条 ─────────────────────────────────────
function drawSummaryBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
) {
  ctx.save()
  ctx.fillStyle = COLORS.SUMMARY_BAR

  // 顶部矩形
  ctx.fillRect(x, y, width, SUMMARY_BAR_HEIGHT)

  // 左端向下箭头
  ctx.beginPath()
  ctx.moveTo(x, y + SUMMARY_BAR_HEIGHT)
  ctx.lineTo(x + SUMMARY_ARROW_SIZE, y + SUMMARY_BAR_HEIGHT)
  ctx.lineTo(x, y + SUMMARY_BAR_HEIGHT + SUMMARY_ARROW_SIZE)
  ctx.closePath()
  ctx.fill()

  // 右端向下箭头
  ctx.beginPath()
  ctx.moveTo(x + width, y + SUMMARY_BAR_HEIGHT)
  ctx.lineTo(x + width - SUMMARY_ARROW_SIZE, y + SUMMARY_BAR_HEIGHT)
  ctx.lineTo(x + width, y + SUMMARY_BAR_HEIGHT + SUMMARY_ARROW_SIZE)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// ─── 负责人分段色带（交接场景） ────────────────────────
function drawAssigneeSegments(
  ctx: CanvasRenderingContext2D,
  assignees: TaskAssignee[],
  barStartX: number,
  barY: number,
  barWidth: number,
  dateToX: (date: Date | string) => number,
  taskStart: string,
  taskEnd: string,
) {
  const segY = barY + TASK_BAR_HEIGHT + 2
  const segH = ASSIGNEE_SEGMENT_HEIGHT

  for (const a of assignees) {
    const from = a.from ?? taskStart
    const to = a.to ?? taskEnd
    const sx = Math.max(dateToX(from), barStartX)
    const ex = Math.min(dateToX(to), barStartX + barWidth)
    const sw = ex - sx
    if (sw <= 0) continue

    const color = getAssigneeColor(a.name)

    // 色带
    ctx.save()
    ctx.fillStyle = color
    const r = Math.min(3, sw / 2)
    roundRect(ctx, sx, segY, sw, segH, r)
    ctx.fill()
    ctx.restore()

    // 姓名首字符标签
    if (sw > 20) {
      ctx.save()
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${ASSIGNEE_AVATAR_FONT}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(a.name[0]!, sx + sw / 2, segY + segH / 2)
      ctx.restore()
    }
  }
}

// ─── 负责人迷你头像（协作场景） ────────────────────────
function drawAssigneeAvatars(
  ctx: CanvasRenderingContext2D,
  assignees: TaskAssignee[],
  barEndX: number,
  barY: number,
) {
  const size = ASSIGNEE_AVATAR_SIZE
  const gap = size - 4 // 堆叠间距
  const maxShow = 4
  const showList = assignees.slice(0, maxShow)
  const cy = barY + TASK_BAR_HEIGHT / 2

  for (let i = 0; i < showList.length; i++) {
    const a = showList[i]!
    const cx = barEndX + 8 + i * gap + size / 2
    const color = getAssigneeColor(a.name)

    // 白色底圈（分隔重叠）
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx, cy, size / 2 + 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 彩色圆
    ctx.save()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 文字
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${ASSIGNEE_AVATAR_FONT}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(a.name[0]!, cx, cy)
    ctx.restore()
  }

  // 溢出指示
  if (assignees.length > maxShow) {
    const overCx = barEndX + 8 + showList.length * gap + size / 2
    ctx.save()
    ctx.fillStyle = '#DCDFE6'
    ctx.beginPath()
    ctx.arc(overCx, cy, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#606266'
    ctx.font = `bold ${ASSIGNEE_AVATAR_FONT}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`+${assignees.length - maxShow}`, overCx, cy)
    ctx.restore()
  }
}

// ─── 圆角矩形辅助 ────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
