/**
 * 日期工具函数
 */

/** 解析 'YYYY-MM-DD' 字符串为 Date */
export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(y, m - 1, d)
}

/** 格式化 Date 为 'YYYY-MM-DD' */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 计算两个日期之间的天数差（含头尾，最少1天） */
export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1)
}

/** 计算两个日期之间的精确天数差（不含尾日） */
export function daysDiff(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return ms / (1000 * 60 * 60 * 24)
}

/** 给日期加N天 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** 获取日期所在月的第一天 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** 获取日期所在月的最后一天 */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/** 获取日期所在周的周一 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 周一开始
  d.setDate(diff)
  return d
}

/** 判断是否为周末 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** 判断两个日期是否为同一天 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** 中文月份 */
const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

/** 中文星期 */
const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? ''
}

export function getWeekdayShort(day: number): string {
  return WEEKDAY_SHORT[day] ?? ''
}

/** 生成日期范围内的所有日期 */
export function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/** 生成周范围 */
export function generateWeekRange(start: Date, end: Date): Date[] {
  const weeks: Date[] = []
  let current = startOfWeek(new Date(start))
  while (current <= end) {
    weeks.push(new Date(current))
    current = addDays(current, 7)
  }
  return weeks
}

/** 生成月范围 */
export function generateMonthRange(start: Date, end: Date): Date[] {
  const months: Date[] = []
  let current = startOfMonth(new Date(start))
  while (current <= end) {
    months.push(new Date(current))
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
  }
  return months
}
