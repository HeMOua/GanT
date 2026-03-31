/**
 * useDependencyLines - 依赖箭头绘制
 *
 * 职责：
 * 1. 根据依赖类型（FS/SS/FF）确定连接点
 * 2. 绘制折线路径
 * 3. 绘制箭头末端
 * 4. 显示 lag 标注
 */
import type { FlattenedTask, GanttDependency } from '../types'
import {
  DEFAULT_ROW_HEIGHT,
  TASK_BAR_HEIGHT,
  COLORS,
  DEPENDENCY_LINE_WIDTH,
  DEPENDENCY_ARROW_SIZE,
} from '../constants'

interface DependencyRendererOptions {
  ctx: CanvasRenderingContext2D
  visibleTasks: FlattenedTask[]
  rowHeight: number
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
  dateToX: (date: Date | string) => number
}

export function renderDependencyLines(options: DependencyRendererOptions) {
  const {
    ctx,
    visibleTasks,
    rowHeight,
    scrollX,
    scrollY,
    canvasWidth,
    canvasHeight,
    dateToX,
  } = options

  const dpr = window.devicePixelRatio || 1
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.translate(-scrollX, -scrollY)

  // 建立 taskId → row index 映射
  const taskRowMap = new Map<number, number>()
  for (let i = 0; i < visibleTasks.length; i++) {
    const ft = visibleTasks[i]
    if (ft) {
      taskRowMap.set(ft.task.id, i)
    }
  }

  for (let i = 0; i < visibleTasks.length; i++) {
    const ft = visibleTasks[i]
    if (!ft) continue
    const task = ft.task
    if (!task.dependencies || task.dependencies.length === 0) continue

    for (const dep of task.dependencies) {
      const sourceRow = taskRowMap.get(dep.task_id)
      if (sourceRow === undefined) continue

      const sourceFt = visibleTasks[sourceRow]
      if (!sourceFt) continue
      const sourceTask = sourceFt.task
      const targetRow = i

      drawDependencyArrow(
        ctx,
        sourceTask,
        task,
        sourceRow,
        targetRow,
        dep,
        rowHeight,
        dateToX,
      )
    }
  }

  ctx.restore()
}

function drawDependencyArrow(
  ctx: CanvasRenderingContext2D,
  sourceTask: { start_time: string; end_time: string; is_milestone?: boolean },
  targetTask: { start_time: string; end_time: string; is_milestone?: boolean },
  sourceRow: number,
  targetRow: number,
  dep: GanttDependency,
  rowHeight: number,
  dateToX: (date: Date | string) => number,
) {
  const barCenterOffset = TASK_BAR_HEIGHT / 2
  const gapH = 12 // 水平间距
  const gapV = 4  // 垂直间距

  // 计算连接点
  let startX: number, startY: number
  let endX: number, endY: number

  const srcBarY = sourceRow * rowHeight + (rowHeight - TASK_BAR_HEIGHT) / 2
  const tgtBarY = targetRow * rowHeight + (rowHeight - TASK_BAR_HEIGHT) / 2

  const srcStartX = dateToX(sourceTask.start_time)
  const srcEndX = dateToX(sourceTask.end_time)
  const tgtStartX = dateToX(targetTask.start_time)
  const tgtEndX = dateToX(targetTask.end_time)

  switch (dep.type) {
    case 'SS': // Start → Start
      startX = srcStartX
      startY = srcBarY + barCenterOffset
      endX = tgtStartX
      endY = tgtBarY + barCenterOffset
      break
    case 'FF': // Finish → Finish
      startX = srcEndX
      startY = srcBarY + barCenterOffset
      endX = tgtEndX
      endY = tgtBarY + barCenterOffset
      break
    case 'FS': // Finish → Start (默认)
    default:
      startX = srcEndX
      startY = srcBarY + barCenterOffset
      endX = tgtStartX
      endY = tgtBarY + barCenterOffset
      break
  }

  // 绘制折线
  ctx.save()
  ctx.strokeStyle = COLORS.DEPENDENCY_LINE
  ctx.lineWidth = DEPENDENCY_LINE_WIDTH
  ctx.fillStyle = COLORS.DEPENDENCY_ARROW

  ctx.beginPath()

  if (dep.type === 'FS' || dep.type === undefined) {
    // Finish → Start 折线
    const midX = startX + gapH
    if (endX > startX + gapH * 2) {
      // 简单的 L 形
      ctx.moveTo(startX, startY)
      ctx.lineTo(midX, startY)
      ctx.lineTo(midX, endY)
      ctx.lineTo(endX, endY)
    } else {
      // S 形（目标在源前面）
      const midY = targetRow > sourceRow
        ? srcBarY + TASK_BAR_HEIGHT + gapV
        : srcBarY - gapV
      ctx.moveTo(startX, startY)
      ctx.lineTo(midX, startY)
      ctx.lineTo(midX, midY)
      ctx.lineTo(endX - gapH, midY)
      ctx.lineTo(endX - gapH, endY)
      ctx.lineTo(endX, endY)
    }
  } else if (dep.type === 'SS') {
    // Start → Start
    const leftX = Math.min(startX, endX) - gapH
    ctx.moveTo(startX, startY)
    ctx.lineTo(leftX, startY)
    ctx.lineTo(leftX, endY)
    ctx.lineTo(endX, endY)
  } else if (dep.type === 'FF') {
    // Finish → Finish
    const rightX = Math.max(startX, endX) + gapH
    ctx.moveTo(startX, startY)
    ctx.lineTo(rightX, startY)
    ctx.lineTo(rightX, endY)
    ctx.lineTo(endX, endY)
  }

  ctx.stroke()

  // 箭头
  drawArrowHead(ctx, endX, endY, dep.type === 'FF' ? 'left' : 'right')

  // Lag 标注
  if (dep.lag && dep.lag > 0) {
    ctx.fillStyle = COLORS.HEADER_TEXT
    ctx.font = '10px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const labelX = (startX + endX) / 2
    const labelY = Math.min(startY, endY) - 4
    ctx.fillText(`+${dep.lag}d`, labelX, labelY)
  }

  ctx.restore()
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right',
) {
  const size = DEPENDENCY_ARROW_SIZE
  ctx.beginPath()
  if (direction === 'right') {
    ctx.moveTo(x, y)
    ctx.lineTo(x - size, y - size / 2)
    ctx.lineTo(x - size, y + size / 2)
  } else {
    ctx.moveTo(x, y)
    ctx.lineTo(x + size, y - size / 2)
    ctx.lineTo(x + size, y + size / 2)
  }
  ctx.closePath()
  ctx.fill()
}
