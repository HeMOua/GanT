<script setup lang="ts">
/**
 * GanttTooltip - 悬浮提示框（含负责人时间可视化）
 */
import { computed } from 'vue'
import type { TooltipData } from './types'
import { getTaskBarColor, getStatusLabel, getAssigneeColor } from './utils/colorUtils'
import { parseDate } from './utils/dateUtils'

interface Props {
  data: TooltipData | null
}

const props = defineProps<Props>()

/** 友好日期格式：M月D日 */
function friendlyDate(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 计算负责人色带在迷你甘特条中的位置百分比 */
function segmentStyle(taskStart: string, taskEnd: string, from?: string, to?: string) {
  const ts = parseDate(taskStart).getTime()
  const te = parseDate(taskEnd).getTime()
  const totalMs = te - ts
  if (totalMs <= 0) return { left: '0%', width: '100%' }

  const fs = parseDate(from ?? taskStart).getTime()
  const fe = parseDate(to ?? taskEnd).getTime()
  const leftPct = Math.max(0, (fs - ts) / totalMs) * 100
  const widthPct = Math.min(100 - leftPct, ((fe - fs) / totalMs) * 100)
  return {
    left: leftPct + '%',
    width: Math.max(widthPct, 2) + '%',
  }
}
</script>

<template>
  <Transition name="tooltip">
    <div
      v-if="data"
      class="gantt-tooltip"
      :style="{
        left: data.x + 16 + 'px',
        top: data.y - 10 + 'px',
      }"
    >
      <div class="gantt-tooltip__header">
        <span
          class="gantt-tooltip__dot"
          :style="{ backgroundColor: getTaskBarColor(data.task) }"
        ></span>
        <span class="gantt-tooltip__name">{{ data.task.name }}</span>
      </div>

      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">开始</span>
        <span class="gantt-tooltip__value">{{ friendlyDate(data.task.start_time) }}</span>
      </div>
      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">结束</span>
        <span class="gantt-tooltip__value">{{ friendlyDate(data.task.end_time) }}</span>
      </div>

      <div v-if="data.task.progress !== undefined" class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">进度</span>
        <span class="gantt-tooltip__value">
          <span class="gantt-tooltip__progress-bar">
            <span
              class="gantt-tooltip__progress-fill"
              :style="{
                width: data.task.progress + '%',
                backgroundColor: getTaskBarColor(data.task),
              }"
            ></span>
          </span>
          {{ data.task.progress }}%
        </span>
      </div>

      <div v-if="data.task.status" class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">状态</span>
        <span class="gantt-tooltip__value">{{ getStatusLabel(data.task.status) }}</span>
      </div>

      <!-- 负责人列表（含迷你甘特条） -->
      <template v-if="data.task.assignees && data.task.assignees.length">
        <div class="gantt-tooltip__divider"></div>
        <div class="gantt-tooltip__section-label">负责人</div>
        <div
          v-for="(a, idx) in data.task.assignees"
          :key="a.name + idx"
          class="gantt-tooltip__assignee-item"
        >
          <div class="gantt-tooltip__assignee-info">
            <span
              class="gantt-tooltip__assignee-dot"
              :style="{ backgroundColor: getAssigneeColor(a.name) }"
            >{{ a.name[0] }}</span>
            <span class="gantt-tooltip__assignee-name">{{ a.name }}</span>
            <span v-if="a.role" class="gantt-tooltip__assignee-role">{{ a.role }}</span>
          </div>
          <!-- 迷你甘特时间条 -->
          <div v-if="a.from || a.to" class="gantt-tooltip__mini-gantt">
            <div class="gantt-tooltip__mini-gantt-track">
              <div
                class="gantt-tooltip__mini-gantt-bar"
                :style="{
                  ...segmentStyle(data.task.start_time, data.task.end_time, a.from, a.to),
                  backgroundColor: getAssigneeColor(a.name),
                }"
              ></div>
            </div>
            <span class="gantt-tooltip__mini-gantt-label">
              {{ friendlyDate(a.from ?? data.task.start_time) }} — {{ friendlyDate(a.to ?? data.task.end_time) }}
            </span>
          </div>
        </div>
      </template>

      <template v-if="data.task.actual_start_time || data.task.actual_end_time">
        <div class="gantt-tooltip__divider"></div>
        <div v-if="data.task.actual_start_time" class="gantt-tooltip__row">
          <span class="gantt-tooltip__label">实际开始</span>
          <span class="gantt-tooltip__value">{{ friendlyDate(data.task.actual_start_time) }}</span>
        </div>
        <div v-if="data.task.actual_end_time" class="gantt-tooltip__row">
          <span class="gantt-tooltip__label">实际结束</span>
          <span class="gantt-tooltip__value">{{ friendlyDate(data.task.actual_end_time) }}</span>
        </div>
      </template>

      <div v-if="data.task.is_milestone" class="gantt-tooltip__tag gantt-tooltip__tag--milestone">
        ◆ 里程碑
      </div>
      <div v-if="data.task.is_critical" class="gantt-tooltip__tag gantt-tooltip__tag--critical">
        ! 关键路径
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gantt-tooltip {
  position: absolute;
  z-index: 1000;
  background: #303133;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  min-width: 200px;
  max-width: 320px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  backdrop-filter: blur(8px);
}

.gantt-tooltip__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.gantt-tooltip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gantt-tooltip__name {
  font-weight: 600;
  font-size: 13px;
}

.gantt-tooltip__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.gantt-tooltip__label {
  color: rgba(255, 255, 255, 0.55);
}

.gantt-tooltip__value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.gantt-tooltip__progress-bar {
  width: 48px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.gantt-tooltip__progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.gantt-tooltip__divider {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 6px 0;
}

.gantt-tooltip__tag {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.gantt-tooltip__tag--milestone {
  background: rgba(230, 162, 60, 0.2);
  color: #E6A23C;
}

.gantt-tooltip__tag--critical {
  background: rgba(230, 57, 74, 0.2);
  color: #F56C6C;
}

.gantt-tooltip__section-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 4px;
  font-weight: 500;
}

/* ─── 负责人条目 ─────────────────────────────────────── */
.gantt-tooltip__assignee-item {
  padding: 4px 0;
}

.gantt-tooltip__assignee-item + .gantt-tooltip__assignee-item {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.gantt-tooltip__assignee-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gantt-tooltip__assignee-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.gantt-tooltip__assignee-name {
  font-weight: 500;
  font-size: 12px;
}

.gantt-tooltip__assignee-role {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

/* ─── 迷你甘特条 ─────────────────────────────────────── */
.gantt-tooltip__mini-gantt {
  margin-top: 4px;
  padding-left: 24px;
}

.gantt-tooltip__mini-gantt-track {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.gantt-tooltip__mini-gantt-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  transition: width 0.2s ease, left 0.2s ease;
}

.gantt-tooltip__mini-gantt-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

/* 动画 */
.tooltip-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-leave-active {
  transition: opacity 0.1s ease;
}
.tooltip-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tooltip-leave-to {
  opacity: 0;
}
</style>
