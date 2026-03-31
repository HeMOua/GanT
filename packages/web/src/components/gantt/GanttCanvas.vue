<script setup lang="ts">
/**
 * GanttCanvas - 甘特图主体 Canvas 渲染区
 */
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import type { FlattenedTask, ViewMode, TooltipData, TimelineCell } from './types'
import { DEFAULT_ROW_HEIGHT, TASK_BAR_HEIGHT, COLORS } from './constants'
import { renderGanttCanvas } from './composables/useCanvasRenderer'
import { renderDependencyLines } from './composables/useDependencyLines'
import { parseDate } from './utils/dateUtils'

interface Props {
  visibleTasks: FlattenedTask[]
  rowHeight: number
  totalWidth: number
  scrollX: number
  scrollY: number
  showToday: boolean
  todayX: number
  viewMode: ViewMode
  cells: TimelineCell[]
  dateToX: (date: Date | string) => number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'hover', data: TooltipData | null): void
  (e: 'task-click', task: FlattenedTask): void
  (e: 'task-dblclick', task: FlattenedTask): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const depCanvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null
let canvasWidth = 0
let canvasHeight = 0

const totalHeight = computed(() => props.visibleTasks.length * props.rowHeight)

function draw() {
  const canvas = canvasRef.value
  const depCanvas = depCanvasRef.value
  if (!canvas || !depCanvas) return

  const parent = canvas.parentElement
  if (!parent) return

  canvasWidth = parent.clientWidth
  canvasHeight = parent.clientHeight
  const dpr = window.devicePixelRatio || 1

  // 设置主画布尺寸
  canvas.width = canvasWidth * dpr
  canvas.height = canvasHeight * dpr
  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  // 设置依赖线画布尺寸
  depCanvas.width = canvasWidth * dpr
  depCanvas.height = canvasHeight * dpr
  depCanvas.style.width = canvasWidth + 'px'
  depCanvas.style.height = canvasHeight + 'px'

  const ctx = canvas.getContext('2d')
  const depCtx = depCanvas.getContext('2d')
  if (!ctx || !depCtx) return

  // 主渲染
  renderGanttCanvas({
    ctx,
    visibleTasks: props.visibleTasks,
    rowHeight: props.rowHeight,
    totalWidth: props.totalWidth,
    totalHeight: totalHeight.value,
    scrollX: props.scrollX,
    scrollY: props.scrollY,
    canvasWidth,
    canvasHeight,
    dateToX: props.dateToX,
    todayX: props.todayX,
    showToday: props.showToday,
    viewMode: props.viewMode,
    cells: props.cells,
  })

  // 依赖线渲染（独立层）
  depCtx.clearRect(0, 0, depCanvas.width, depCanvas.height)
  renderDependencyLines({
    ctx: depCtx,
    visibleTasks: props.visibleTasks,
    rowHeight: props.rowHeight,
    scrollX: props.scrollX,
    scrollY: props.scrollY,
    canvasWidth,
    canvasHeight,
    dateToX: props.dateToX,
  })
}

function requestDraw() {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
  animFrameId = requestAnimationFrame(draw)
}

// ─── 鼠标事件 ─────────────────────────────────────────
function getTaskAtPosition(clientX: number, clientY: number): FlattenedTask | null {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left + props.scrollX
  const y = clientY - rect.top + props.scrollY
  const rowIndex = Math.floor(y / props.rowHeight)

  if (rowIndex < 0 || rowIndex >= props.visibleTasks.length) return null

  const ft = props.visibleTasks[rowIndex]
  if (!ft) return null
  const task = ft.task
  const startX = props.dateToX(task.start_time)
  const endX = props.dateToX(task.end_time)

  if (task.is_milestone) {
    const mid = startX
    if (Math.abs(x - mid) < 10) return ft
    return null
  }

  if (x >= startX - 2 && x <= endX + 2) return ft
  return null
}

function handleMouseMove(e: MouseEvent) {
  const ft = getTaskAtPosition(e.clientX, e.clientY)
  if (ft) {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    emit('hover', {
      task: ft.task,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  } else {
    emit('hover', null)
  }
}

function handleMouseLeave() {
  emit('hover', null)
}

function handleClick(e: MouseEvent) {
  const ft = getTaskAtPosition(e.clientX, e.clientY)
  if (ft) {
    emit('task-click', ft)
  }
}

function handleDblclick(e: MouseEvent) {
  const ft = getTaskAtPosition(e.clientX, e.clientY)
  if (ft) {
    emit('task-dblclick', ft)
  }
}

// ─── 生命周期 ─────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  requestDraw()
  resizeObserver = new ResizeObserver(() => requestDraw())
  if (canvasRef.value?.parentElement) {
    resizeObserver.observe(canvasRef.value.parentElement)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
})

watch(
  () => [
    props.scrollX,
    props.scrollY,
    props.visibleTasks,
    props.viewMode,
    props.totalWidth,
    props.todayX,
    props.showToday,
  ],
  () => requestDraw(),
  { deep: true },
)
</script>

<template>
  <div
    class="gantt-canvas"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
    @dblclick="handleDblclick"
  >
    <canvas ref="canvasRef" class="gantt-canvas__main"></canvas>
    <canvas ref="depCanvasRef" class="gantt-canvas__dep"></canvas>
  </div>
</template>

<style scoped>
.gantt-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: default;
}

.gantt-canvas__main,
.gantt-canvas__dep {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.gantt-canvas__dep {
  pointer-events: none;
}
</style>
