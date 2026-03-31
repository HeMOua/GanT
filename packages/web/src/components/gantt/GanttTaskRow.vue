<script setup lang="ts">
/**
 * GanttTaskRow - 任务树单行组件
 */
import { computed } from 'vue'
import type { FlattenedTask } from './types'
import { TREE_INDENT, TREE_ICON_SIZE, COLORS } from './constants'
import { getTaskBarColor, getStatusLabel, getAssigneeGradient } from './utils/colorUtils'

interface Props {
  flatTask: FlattenedTask
  rowHeight: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'toggle', taskId: number): void
  (e: 'click', task: FlattenedTask): void
}>()

const assignees = computed(() => props.flatTask.task.assignees ?? [])
const maxShow = 3
const visibleAssignees = computed(() => assignees.value.slice(0, maxShow))
const overflowCount = computed(() => Math.max(0, assignees.value.length - maxShow))
const assigneeTip = computed(() =>
  assignees.value.map(a => a.role ? `${a.name}（${a.role}）` : a.name).join('、'),
)

function handleToggle(event: Event) {
  event.stopPropagation()
  emit('toggle', props.flatTask.task.id)
}

function handleClick() {
  emit('click', props.flatTask)
}
</script>

<template>
  <div
    class="gantt-task-row"
    :style="{ height: rowHeight + 'px' }"
    @click="handleClick"
  >
    <div
      class="gantt-task-row__content"
      :style="{ paddingLeft: flatTask.level * TREE_INDENT + 8 + 'px' }"
    >
      <!-- 展开/折叠按钮 -->
      <button
        v-if="flatTask.hasChildren"
        class="gantt-task-row__toggle"
        @click="handleToggle"
      >
        <svg
          :class="['gantt-task-row__arrow', { 'gantt-task-row__arrow--expanded': flatTask.expanded }]"
          viewBox="0 0 16 16"
          :width="TREE_ICON_SIZE - 4"
          :height="TREE_ICON_SIZE - 4"
        >
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span v-else class="gantt-task-row__spacer" :style="{ width: TREE_ICON_SIZE + 'px' }"></span>

      <!-- 状态指示点 -->
      <span
        class="gantt-task-row__dot"
        :style="{
          backgroundColor: flatTask.task.is_milestone ? '#E6A23C' : getTaskBarColor(flatTask.task),
        }"
      ></span>

      <!-- 任务名 -->
      <span class="gantt-task-row__name" :title="flatTask.task.name">
        {{ flatTask.task.name }}
      </span>

      <!-- 负责人（多人堆叠头像） -->
      <div
        v-if="assignees.length"
        class="gantt-task-row__assignees"
        :title="assigneeTip"
      >
        <span
          v-for="(a, idx) in visibleAssignees"
          :key="a.name + idx"
          class="gantt-task-row__avatar"
          :style="{
            background: getAssigneeGradient(a.name),
            zIndex: maxShow - idx,
            marginLeft: idx > 0 ? '-8px' : '0',
          }"
        >{{ a.name[0] }}</span>
        <span
          v-if="overflowCount > 0"
          class="gantt-task-row__avatar gantt-task-row__avatar--overflow"
          :style="{ marginLeft: '-8px', zIndex: 0 }"
        >+{{ overflowCount }}</span>
      </div>

      <!-- 里程碑标记 -->
      <span v-if="flatTask.task.is_milestone" class="gantt-task-row__badge gantt-task-row__badge--milestone">
        ◆
      </span>

      <!-- 关键路径标记 -->
      <span v-if="flatTask.task.is_critical" class="gantt-task-row__badge gantt-task-row__badge--critical">
        !
      </span>
    </div>
  </div>
</template>

<style scoped>
.gantt-task-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid v-bind('COLORS.TREE_BORDER');
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.gantt-task-row:hover {
  background-color: v-bind('COLORS.TREE_HOVER');
}

.gantt-task-row__content {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.gantt-task-row__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  color: v-bind('COLORS.TREE_TEXT_SECONDARY');
  padding: 0;
  transition: all 0.15s ease;
}

.gantt-task-row__toggle:hover {
  background-color: rgba(0, 0, 0, 0.06);
  color: v-bind('COLORS.TREE_TEXT');
}

.gantt-task-row__arrow {
  transition: transform 0.2s ease;
}

.gantt-task-row__arrow--expanded {
  transform: rotate(90deg);
}

.gantt-task-row__spacer {
  flex-shrink: 0;
}

.gantt-task-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gantt-task-row__name {
  font-size: 13px;
  color: v-bind('COLORS.TREE_TEXT');
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.gantt-task-row__badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  line-height: 1;
}

.gantt-task-row__badge--milestone {
  color: #E6A23C;
}

.gantt-task-row__badge--critical {
  color: #fff;
  background-color: #E6394A;
  font-weight: 700;
}

.gantt-task-row__assignees {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
  margin-right: 8px;
}

.gantt-task-row__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF, #6366F1);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  border: 2px solid #fff;
  position: relative;
  box-sizing: border-box;
}

.gantt-task-row__avatar--overflow {
  background: #DCDFE6 !important;
  color: #606266;
  font-size: 9px;
  font-weight: 700;
}
</style>
