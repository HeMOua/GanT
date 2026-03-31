<script setup lang="ts">
/**
 * GanttChart - 甘特图主组件
 *
 * 功能：
 * - 左侧任务树 + 右侧时间轴/画布
 * - 可拖拽分隔条
 * - 滚动同步
 * - 缩放控制
 * - Tooltip
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { GanttTask, ViewMode, FlattenedTask, TooltipData } from './types'
import {
  DEFAULT_ROW_HEIGHT,
  HEADER_HEIGHT,
  TREE_PANEL_DEFAULT_WIDTH,
  TREE_PANEL_MIN_WIDTH,
  COLORS,
  SCROLL_SPEED,
} from './constants'
import { useGanttData } from './composables/useGanttData'
import { useTimeline } from './composables/useTimeline'
import GanttTaskTree from './GanttTaskTree.vue'
import GanttHeader from './GanttHeader.vue'
import GanttCanvas from './GanttCanvas.vue'
import GanttTooltip from './GanttTooltip.vue'

// ─── Props & Emits ────────────────────────────────────
interface Props {
  tasks: GanttTask[]
  viewMode?: ViewMode
  rowHeight?: number
  showToday?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'day',
  rowHeight: DEFAULT_ROW_HEIGHT,
  showToday: true,
})

const emit = defineEmits<{
  (e: 'task-click', task: GanttTask): void
  (e: 'task-dblclick', task: GanttTask): void
}>()

// ─── 内部状态 ─────────────────────────────────────────
const currentViewMode = ref<ViewMode>(props.viewMode)
const treePanelWidth = ref(TREE_PANEL_DEFAULT_WIDTH)
const scrollX = ref(0)
const scrollY = ref(0)
const tooltipData = ref<TooltipData | null>(null)
const chartBodyRef = ref<HTMLDivElement | null>(null)

// 外部 viewMode 同步
watch(() => props.viewMode, (v) => {
  currentViewMode.value = v
})

// ─── Composables ─────────────────────────────────────
const { visibleTasks, toggleExpand, expandAll, collapseAll } = useGanttData(
  () => props.tasks,
)

const { cells, headerGroups, totalWidth, dateToX, todayX, todayScrollX } = useTimeline(
  () => props.tasks,
  currentViewMode,
)

// ─── 计算属性 ─────────────────────────────────────────
const totalHeight = computed(() => visibleTasks.value.length * props.rowHeight)

// ─── 滚动处理 ─────────────────────────────────────────
function handleWheel(e: WheelEvent) {
  e.preventDefault()

  if (e.ctrlKey || e.metaKey) {
    // Ctrl + 滚轮 = 缩放
    return
  }

  // 水平 + 垂直滚动
  const dx = e.deltaX * SCROLL_SPEED
  const dy = e.deltaY * SCROLL_SPEED

  // 如果是纯垂直滚动 + shift，转为水平
  if (e.shiftKey) {
    scrollX.value = Math.max(0, Math.min(scrollX.value + dy, Math.max(0, totalWidth.value - 400)))
  } else {
    scrollX.value = Math.max(0, Math.min(scrollX.value + dx, Math.max(0, totalWidth.value - 400)))
    scrollY.value = Math.max(0, Math.min(scrollY.value + dy, Math.max(0, totalHeight.value - 200)))
  }
}

// ─── 分隔条拖拽 ──────────────────────────────────────
let isDraggingSplitter = false

function handleSplitterMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDraggingSplitter = true
  const startX = e.clientX
  const startWidth = treePanelWidth.value

  function onMove(ev: MouseEvent) {
    if (!isDraggingSplitter) return
    const dx = ev.clientX - startX
    treePanelWidth.value = Math.max(TREE_PANEL_MIN_WIDTH, Math.min(startWidth + dx, 500))
  }

  function onUp() {
    isDraggingSplitter = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// ─── 视图切换 ─────────────────────────────────────────
function setViewMode(mode: ViewMode) {
  currentViewMode.value = mode
}

// ─── 跳转到今天 ──────────────────────────────────────
function scrollToToday() {
  scrollX.value = todayScrollX.value
}

// ─── 事件处理 ─────────────────────────────────────────
function handleTooltip(data: TooltipData | null) {
  tooltipData.value = data
}

function handleTaskClick(ft: FlattenedTask) {
  emit('task-click', ft.task)
}

function handleTaskDblclick(ft: FlattenedTask) {
  emit('task-dblclick', ft.task)
}

// ─── 初始定位 ─────────────────────────────────────────
onMounted(() => {
  nextTick(() => {
    if (props.showToday) {
      scrollToToday()
    }
  })
})
</script>

<template>
  <div class="gantt-chart">
    <!-- 工具栏 -->
    <div class="gantt-toolbar">
      <div class="gantt-toolbar__left">
        <button
          class="gantt-toolbar__btn"
          :class="{ 'gantt-toolbar__btn--active': currentViewMode === 'day' }"
          @click="setViewMode('day')"
        >
          日
        </button>
        <button
          class="gantt-toolbar__btn"
          :class="{ 'gantt-toolbar__btn--active': currentViewMode === 'week' }"
          @click="setViewMode('week')"
        >
          周
        </button>
        <button
          class="gantt-toolbar__btn"
          :class="{ 'gantt-toolbar__btn--active': currentViewMode === 'month' }"
          @click="setViewMode('month')"
        >
          月
        </button>
      </div>
      <div class="gantt-toolbar__right">
        <button class="gantt-toolbar__btn" @click="expandAll">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 6l4 4 4-4"/>
          </svg>
          展开
        </button>
        <button class="gantt-toolbar__btn" @click="collapseAll">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 10l4-4 4 4"/>
          </svg>
          折叠
        </button>
        <button class="gantt-toolbar__btn gantt-toolbar__btn--today" @click="scrollToToday">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="3"/>
            <path d="M8 2v2M8 12v2M2 8h2M12 8h2"/>
          </svg>
          今天
        </button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="gantt-body" ref="chartBodyRef" @wheel.passive="false" @wheel="handleWheel">
      <!-- 左侧任务树 -->
      <div
        class="gantt-body__tree"
        :style="{ width: treePanelWidth + 'px' }"
      >
        <GanttTaskTree
          :visible-tasks="visibleTasks"
          :row-height="rowHeight"
          :scroll-y="scrollY"
          @toggle="toggleExpand"
          @task-click="handleTaskClick"
        />
      </div>

      <!-- 分隔条 -->
      <div
        class="gantt-splitter"
        @mousedown="handleSplitterMouseDown"
      ></div>

      <!-- 右侧时间轴区域 -->
      <div class="gantt-body__chart">
        <GanttHeader
          :cells="cells"
          :header-groups="headerGroups"
          :total-width="totalWidth"
          :scroll-x="scrollX"
          :view-mode="currentViewMode"
        />
        <GanttCanvas
          :visible-tasks="visibleTasks"
          :row-height="rowHeight"
          :total-width="totalWidth"
          :scroll-x="scrollX"
          :scroll-y="scrollY"
          :show-today="showToday"
          :today-x="todayX"
          :view-mode="currentViewMode"
          :cells="cells"
          :date-to-x="dateToX"
          @hover="handleTooltip"
          @task-click="handleTaskClick"
          @task-dblclick="handleTaskDblclick"
        />
        <GanttTooltip :data="tooltipData" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid v-bind('COLORS.TREE_BORDER');
  border-radius: 10px;
  overflow: hidden;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* ─── 工具栏 ─────────────────────────────────────────── */
.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid v-bind('COLORS.HEADER_BORDER');
  background: v-bind('COLORS.HEADER_BG');
  flex-shrink: 0;
}

.gantt-toolbar__left,
.gantt-toolbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gantt-toolbar__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid v-bind('COLORS.TREE_BORDER');
  border-radius: 6px;
  background: #fff;
  color: v-bind('COLORS.HEADER_TEXT');
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  line-height: 1;
}

.gantt-toolbar__btn:hover {
  background: v-bind('COLORS.TREE_HOVER');
  border-color: #C0C4CC;
}

.gantt-toolbar__btn--active {
  background: #409EFF;
  color: #fff;
  border-color: #409EFF;
}

.gantt-toolbar__btn--active:hover {
  background: #337ecc;
  border-color: #337ecc;
}

.gantt-toolbar__btn--today {
  border-color: #E6394A;
  color: #E6394A;
}

.gantt-toolbar__btn--today:hover {
  background: rgba(230, 57, 74, 0.06);
}

/* ─── 主体 ───────────────────────────────────────────── */
.gantt-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.gantt-body__tree {
  flex-shrink: 0;
  overflow: hidden;
}

.gantt-body__chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

/* ─── 分隔条 ─────────────────────────────────────────── */
.gantt-splitter {
  width: 5px;
  cursor: col-resize;
  background: v-bind('COLORS.SPLITTER');
  flex-shrink: 0;
  transition: background 0.15s ease;
  position: relative;
  z-index: 10;
}

.gantt-splitter:hover,
.gantt-splitter:active {
  background: v-bind('COLORS.SPLITTER_HOVER');
}
</style>
