<script setup lang="ts">
/**
 * GanttTaskTree - 左侧任务树面板
 */
import type { FlattenedTask } from './types'
import { COLORS } from './constants'
import GanttTaskRow from './GanttTaskRow.vue'

interface Props {
  visibleTasks: FlattenedTask[]
  rowHeight: number
  scrollY: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'toggle', taskId: number): void
  (e: 'task-click', task: FlattenedTask): void
}>()
</script>

<template>
  <div class="gantt-task-tree">
    <!-- 头部 -->
    <div class="gantt-task-tree__header">
      <span class="gantt-task-tree__title">任务名称</span>
    </div>

    <!-- 滚动区 -->
    <div
      class="gantt-task-tree__body"
      :style="{ transform: `translateY(${-scrollY}px)` }"
    >
      <GanttTaskRow
        v-for="ft in visibleTasks"
        :key="ft.task.id"
        :flat-task="ft"
        :row-height="rowHeight"
        @toggle="emit('toggle', $event)"
        @click="emit('task-click', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.gantt-task-tree {
  display: flex;
  flex-direction: column;
  background: v-bind('COLORS.TREE_BG');
  overflow: hidden;
  border-right: 1px solid v-bind('COLORS.TREE_BORDER');
}

.gantt-task-tree__header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid v-bind('COLORS.HEADER_BORDER');
  background: v-bind('COLORS.HEADER_BG');
  flex-shrink: 0;
}

.gantt-task-tree__title {
  font-size: 13px;
  font-weight: 600;
  color: v-bind('COLORS.HEADER_TEXT');
}

.gantt-task-tree__body {
  flex: 1;
  position: relative;
}
</style>
