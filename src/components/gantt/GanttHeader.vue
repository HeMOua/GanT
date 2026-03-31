<script setup lang="ts">
/**
 * GanttHeader - 时间轴头部（Canvas 渲染）
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { TimelineCell, TimelineGroup, ViewMode } from './types'
import { HEADER_HEIGHT, HEADER_TOP_HEIGHT, HEADER_BOTTOM_HEIGHT, COLORS } from './constants'
import { getWeekdayShort } from './utils/dateUtils'

interface Props {
  cells: TimelineCell[]
  headerGroups: TimelineGroup[]
  totalWidth: number
  scrollX: number
  viewMode: ViewMode
}

const props = defineProps<Props>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let dpr = 1

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.parentElement?.clientWidth || canvas.clientWidth
  const height = HEADER_HEIGHT

  dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'

  ctx.save()
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = COLORS.HEADER_BG
  ctx.fillRect(0, 0, width, height)

  // 平移到滚动位置
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, height)
  ctx.clip()
  ctx.translate(-props.scrollX, 0)

  // 上层分组
  ctx.fillStyle = COLORS.HEADER_TEXT
  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const group of props.headerGroups) {
    const gx = group.x
    const gw = group.width

    // 如果不在可见范围内，跳过
    if (gx + gw < props.scrollX || gx > props.scrollX + width) continue

    // 分隔线
    ctx.strokeStyle = COLORS.HEADER_BORDER
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gx + gw, 0)
    ctx.lineTo(gx + gw, HEADER_TOP_HEIGHT)
    ctx.stroke()

    // 标签
    const textX = Math.max(gx, props.scrollX) + Math.min(gw, width) / 2
    ctx.fillStyle = COLORS.HEADER_TEXT
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
    ctx.fillText(group.label, gx + gw / 2, HEADER_TOP_HEIGHT / 2)
  }

  // 上下分隔线
  ctx.strokeStyle = COLORS.HEADER_BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(props.scrollX, HEADER_TOP_HEIGHT)
  ctx.lineTo(props.scrollX + width, HEADER_TOP_HEIGHT)
  ctx.stroke()

  // 下层单元格
  for (const cell of props.cells) {
    const cx = cell.x
    const cw = cell.width
    if (cx + cw < props.scrollX || cx > props.scrollX + width) continue

    // 今天高亮
    if (cell.isToday) {
      ctx.fillStyle = 'rgba(230, 57, 74, 0.08)'
      ctx.fillRect(cx, HEADER_TOP_HEIGHT, cw, HEADER_BOTTOM_HEIGHT)
    }

    // 周末背景
    if (cell.isWeekend) {
      ctx.fillStyle = COLORS.WEEKEND_BG
      ctx.fillRect(cx, HEADER_TOP_HEIGHT, cw, HEADER_BOTTOM_HEIGHT)
    }

    // 分隔线
    ctx.strokeStyle = COLORS.HEADER_BORDER
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(cx + cw, HEADER_TOP_HEIGHT)
    ctx.lineTo(cx + cw, HEADER_HEIGHT)
    ctx.stroke()

    // 日期标签
    ctx.fillStyle = cell.isToday ? COLORS.TODAY_LINE : cell.isWeekend ? COLORS.TREE_TEXT_SECONDARY : COLORS.HEADER_TEXT
    ctx.font = cell.isToday ? 'bold 12px system-ui, -apple-system, sans-serif' : '12px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (props.viewMode === 'day') {
      // 日视图：上面日期数字，下面星期
      ctx.fillText(cell.label, cx + cw / 2, HEADER_TOP_HEIGHT + HEADER_BOTTOM_HEIGHT / 2 - 5)
      ctx.font = '10px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = cell.isWeekend ? COLORS.TREE_TEXT_SECONDARY : 'rgba(96,98,102,0.6)'
      ctx.fillText(getWeekdayShort(cell.date.getDay()), cx + cw / 2, HEADER_TOP_HEIGHT + HEADER_BOTTOM_HEIGHT / 2 + 8)
    } else {
      ctx.fillText(cell.label, cx + cw / 2, HEADER_TOP_HEIGHT + HEADER_BOTTOM_HEIGHT / 2)
    }
  }

  ctx.restore() // clip restore

  // 底边线
  ctx.strokeStyle = COLORS.HEADER_BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, HEADER_HEIGHT - 0.5)
  ctx.lineTo(width, HEADER_HEIGHT - 0.5)
  ctx.stroke()

  ctx.restore() // scale restore
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  draw()
  resizeObserver = new ResizeObserver(() => draw())
  if (canvasRef.value?.parentElement) {
    resizeObserver.observe(canvasRef.value.parentElement)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(
  () => [props.scrollX, props.cells, props.headerGroups, props.viewMode],
  () => nextTick(draw),
  { deep: true },
)
</script>

<template>
  <div class="gantt-header" :style="{ height: HEADER_HEIGHT + 'px' }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.gantt-header {
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
}

.gantt-header canvas {
  display: block;
}
</style>
