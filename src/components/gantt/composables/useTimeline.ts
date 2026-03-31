/**
 * useTimeline - 时间轴计算 composable
 *
 * 职责：
 * 1. 计算时间轴范围（所有任务的最早/最晚日期 + 前后留白）
 * 2. 根据视图模式生成单元格
 * 3. 日期 ↔ 像素 坐标映射
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { GanttTask, ViewMode, TimelineCell, TimelineGroup } from '../types'
import { CELL_WIDTHS } from '../constants'
import {
  parseDate,
  addDays,
  isWeekend,
  isSameDay,
  generateDateRange,
  generateWeekRange,
  generateMonthRange,
  startOfMonth,
  endOfMonth,
  getMonthName,
  startOfWeek,
} from '../utils/dateUtils'

export function useTimeline(
  tasks: () => GanttTask[],
  viewMode: Ref<ViewMode>,
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 计算时间范围（所有任务 + 实际时间 + 前后留白）
  const timeRange = computed(() => {
    const taskList = tasks()
    if (!taskList.length) {
      const start = addDays(today, -7)
      const end = addDays(today, 30)
      return { start, end }
    }

    let minDate = Infinity
    let maxDate = -Infinity

    for (const task of taskList) {
      const s = parseDate(task.start_time).getTime()
      const e = parseDate(task.end_time).getTime()
      if (s < minDate) minDate = s
      if (e > maxDate) maxDate = e
      // 包含实际时间
      if (task.actual_start_time) {
        const as = parseDate(task.actual_start_time).getTime()
        if (as < minDate) minDate = as
      }
      if (task.actual_end_time) {
        const ae = parseDate(task.actual_end_time).getTime()
        if (ae > maxDate) maxDate = ae
      }
    }

    // 前后留白
    const padding = viewMode.value === 'month' ? 15 : viewMode.value === 'week' ? 7 : 3
    const start = addDays(new Date(minDate), -padding)
    const end = addDays(new Date(maxDate), padding)
    return { start, end }
  })

  // 单元格宽度
  const cellWidth = computed(() => CELL_WIDTHS[viewMode.value]!)

  // 生成日期单元格（日视图用）
  const dateCells = computed<TimelineCell[]>(() => {
    const { start, end } = timeRange.value
    const cw = cellWidth.value
    const dates = generateDateRange(start, end)
    return dates.map((date, i) => ({
      date,
      label: `${date.getDate()}`,
      x: i * cw,
      width: cw,
      isWeekend: isWeekend(date),
      isToday: isSameDay(date, today),
    }))
  })

  // 生成周单元格
  const weekCells = computed<TimelineCell[]>(() => {
    const { start, end } = timeRange.value
    const cw = cellWidth.value
    const weeks = generateWeekRange(start, end)
    return weeks.map((date, i) => {
      const endOfWeek = addDays(date, 6)
      return {
        date,
        label: `${date.getMonth() + 1}/${date.getDate()} - ${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`,
        x: i * cw,
        width: cw,
        isWeekend: false,
        isToday: false,
      }
    })
  })

  // 生成月单元格
  const monthCells = computed<TimelineCell[]>(() => {
    const { start, end } = timeRange.value
    const cw = cellWidth.value
    const months = generateMonthRange(start, end)
    return months.map((date, i) => ({
      date,
      label: `${date.getFullYear()}年${getMonthName(date.getMonth())}`,
      x: i * cw,
      width: cw,
      isWeekend: false,
      isToday: false,
    }))
  })

  // 当前视图使用的单元格
  const cells = computed<TimelineCell[]>(() => {
    switch (viewMode.value) {
      case 'week': return weekCells.value
      case 'month': return monthCells.value
      default: return dateCells.value
    }
  })

  // 上层分组（日视图→按月分组，周视图→按月分组，月视图→按年分组）
  const headerGroups = computed<TimelineGroup[]>(() => {
    const cellList = cells.value
    if (!cellList.length) return []

    const groups: TimelineGroup[] = []
    let currentLabel = ''
    let groupStart = 0

    for (let i = 0; i < cellList.length; i++) {
      const cell = cellList[i]!
      let label: string
      if (viewMode.value === 'month') {
        label = `${cell.date.getFullYear()}年`
      } else {
        label = `${cell.date.getFullYear()}年${getMonthName(cell.date.getMonth())}`
      }

      if (label !== currentLabel) {
        if (currentLabel) {
          groups.push({
            label: currentLabel,
            x: cellList[groupStart]!.x,
            width: cell.x - cellList[groupStart]!.x,
          })
        }
        currentLabel = label
        groupStart = i
      }
    }
    // 最后一组
    if (currentLabel && cellList.length > 0) {
      const lastCell = cellList[cellList.length - 1]!
      groups.push({
        label: currentLabel,
        x: cellList[groupStart]!.x,
        width: lastCell.x + lastCell.width - cellList[groupStart]!.x,
      })
    }
    return groups
  })

  // 总宽度
  const totalWidth = computed(() => {
    const c = cells.value
    if (!c.length) return 0
    const last = c[c.length - 1]!
    return last.x + last.width
  })

  // 日期 → 像素X坐标
  function dateToX(date: Date | string): number {
    const d = typeof date === 'string' ? parseDate(date) : date
    const { start } = timeRange.value

    const cw = cellWidth.value
    if (viewMode.value === 'day') {
      const dayOffset = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      return dayOffset * cw
    } else if (viewMode.value === 'week') {
      const weekStart = startOfWeek(start)
      const dayOffset = (d.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      return (dayOffset / 7) * cw
    } else {
      // 月视图
      const monthStart = startOfMonth(start)
      const months = generateMonthRange(monthStart, d)
      if (months.length === 0) return 0
      // 在最后一个月中的精确位置
      const lastMonth = months[months.length - 1]!
      const daysInMonth = endOfMonth(lastMonth).getDate()
      const dayInMonth = d.getDate() - 1
      return (months.length - 1) * cw + (dayInMonth / daysInMonth) * cw
    }
  }

  // 今日线的 X 坐标
  const todayX = computed(() => dateToX(today))

  // 获取给定 X 坐标需要滚动到的位置来显示 today
  const todayScrollX = computed(() => {
    return Math.max(0, todayX.value - 200)
  })

  return {
    timeRange,
    cellWidth,
    cells,
    headerGroups,
    totalWidth,
    dateToX,
    todayX,
    todayScrollX,
    today,
  }
}
