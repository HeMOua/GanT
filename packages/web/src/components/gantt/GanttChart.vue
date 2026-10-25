<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  NButton,
  NButtonGroup,
  NInput,
  NTag,
  NSelect,
  useMessage,
  useDialog,
} from "naive-ui";
import {
  Search,
  CalendarCheck,
  ChevronsDownUp,
  ChevronsUpDown,
} from "@lucide/vue";
import { Gantt, type GanttStatic } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import type { GanttTask, ViewMode, DependencyType } from "./types";
import { toChartData, toTaskPatch, escapeText, linkTypes } from "./adapter";
const props = withDefaults(
  defineProps<{
    tasks: GanttTask[];
    viewMode?: ViewMode;
    rowHeight?: number;
    showToday?: boolean;
    readonly?: boolean;
    saveTask?: (id: number, patch: any) => Promise<void>;
    addDependency?: (
      id: number,
      data: { depends_on_task_id: number; type: DependencyType; lag?: number },
    ) => Promise<void>;
    removeDependency?: (taskId: number, depId: number) => Promise<void>;
  }>(),
  { viewMode: "day", rowHeight: 42, showToday: true, readonly: false },
);
const emit = defineEmits<{
  (e: "task-click", task: GanttTask): void;
  (e: "task-dblclick", task: GanttTask): void;
}>();
const host = ref<HTMLDivElement | null>(null),
  mode = ref<ViewMode>(props.viewMode),
  search = ref(""),
  status = ref<string | null>(null),
  busy = ref(false);
const message = useMessage(),
  dialog = useDialog();
let chart: GanttStatic,
  observer: ResizeObserver,
  syncing = false,
  disposed = false;
const statuses = [
  { label: "未开始", value: "NOT_STARTED" },
  { label: "进行中", value: "IN_PROGRESS" },
  { label: "已完成", value: "DONE" },
  { label: "已阻塞", value: "BLOCKED" },
];
const labels: Record<string, string> = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  DONE: "已完成",
  BLOCKED: "已阻塞",
};
const visibleIds = computed(() => {
  const result = new Set<number>(),
    byId = new Map(props.tasks.map((t) => [t.id, t]));
  for (const task of props.tasks) {
    if (
      !task.name.toLowerCase().includes(search.value.toLowerCase()) ||
      (status.value && (task.status || "NOT_STARTED") !== status.value)
    )
      continue;
    let current: GanttTask | undefined = task;
    while (current && !result.has(current.id)) {
      result.add(current.id);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
  }
  return result;
});
function edit(id: string | number) {
  const t = props.tasks.find((t) => t.id === Number(id));
  if (t) emit("task-dblclick", t);
}
function draw() {
  if (!chart || disposed || busy.value) return;
  const scroll = chart.getScrollState(),
    selected = chart.getSelectedId(),
    closed = new Set<number>();
  chart.eachTask((t) => {
    if (!t.$open) closed.add(Number(t.id));
  });
  syncing = true;
  try {
    chart.clearAll();
    chart.parse(toChartData(props.tasks));
    closed.forEach((id) => {
      if (chart.isTaskExists(id)) chart.close(id);
    });
    if (selected && chart.isTaskExists(selected)) chart.selectTask(selected);
    chart.scrollTo(scroll.x, scroll.y);
    updateToday();
  } finally {
    syncing = false;
  }
}
function updateToday() {
  const area = host.value?.querySelector<HTMLElement>(".gantt_data_area");
  area?.querySelector(".gantt-today")?.remove();
  if (!area || !props.showToday) return;
  const x = chart.posFromDate(new Date(new Date().setHours(0, 0, 0, 0)));
  if (typeof x !== "number" || x < 0) return;
  const marker = document.createElement("div");
  marker.className = "gantt-today";
  marker.style.left = `${x}px`;
  const label = document.createElement("span");
  label.textContent = "今天";
  marker.append(label);
  area.append(marker);
}

async function persist(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  chart.config.readonly = true;
  try {
    await action();
  } catch {
    message.error("保存失败，已恢复原计划，请重试");
  } finally {
    busy.value = false;
    if (!disposed) {
      chart.config.readonly = props.readonly;
      await nextTick();
      draw();
    }
  }
}
function scale() {
  if (!chart) return;
  chart.config.scales =
    mode.value === "day"
      ? [
          { unit: "month", step: 1, format: "%Y年%m月" },
          { unit: "day", step: 1, format: "%d %D" },
        ]
      : mode.value === "week"
        ? [
            { unit: "month", step: 1, format: "%Y年%m月" },
            { unit: "week", step: 1, format: "%m月%d日" },
          ]
        : [
            { unit: "year", step: 1, format: "%Y年" },
            { unit: "month", step: 1, format: "%m月" },
          ];
  chart.config.min_column_width =
    mode.value === "day" ? 48 : mode.value === "week" ? 110 : 130;
  chart.render();
}
function today() {
  chart?.showDate(new Date());
}
function expand(open: boolean) {
  chart.batchUpdate(() =>
    chart.eachTask((t) => (open ? chart.open(t.id) : chart.close(t.id))),
  );
}
watch(mode, scale);
watch(
  () => props.viewMode,
  (v) => (mode.value = v),
);
watch(() => props.tasks, draw, { deep: true, flush: "post" });
watch([search, status], () => chart?.refreshData());
watch(
  () => props.readonly,
  (v) => {
    if (chart) chart.config.readonly = v || busy.value;
  },
);
onMounted(() => {
  chart = Gantt.getGanttInstance();
  chart.i18n.setLocale("cn");
  chart.plugins({ tooltip: true, keyboard_navigation: true });
  chart.setSkin("material");
  Object.assign(chart.config, {
    date_format: "%Y-%m-%d",
    row_height: props.rowHeight,
    bar_height: 24,
    scale_height: 64,
    grid_width: 420,
    smart_rendering: true,
    autofit: false,
    show_progress: true,
    drag_move: !!props.saveTask,
    drag_resize: !!props.saveTask,
    drag_progress: !!props.saveTask,
    drag_links: !!props.addDependency,
    readonly: props.readonly,
    details_on_dblclick: false,
    show_errors: false,
    show_links: true,
    scroll_on_click: false,
    work_time: false,
    show_tasks_outside_timescale: true,
  });
  chart.config.columns = [
    { name: "text", label: "任务名称", tree: true, width: "*", min_width: 170 },
    {
      name: "owners",
      label: "负责人",
      width: 86,
      template: (t) => escapeText(t.owners) || "—",
    },
    {
      name: "progress",
      label: "进度",
      width: 60,
      align: "right",
      template: (t) => `${Math.round((t.progress || 0) * 100)}%`,
    },
  ];
  chart.config.layout = {
    css: "gantt-layout",
    cols: [
      {
        width: 420,
        min_width: 300,
        rows: [
          { view: "grid", scrollX: "gridScroll", scrollY: "scrollVer" },
          { view: "scrollbar", id: "gridScroll" },
        ],
      },
      { resizer: true, width: 1 },
      {
        rows: [
          { view: "timeline", scrollX: "scrollHor", scrollY: "scrollVer" },
          { view: "scrollbar", id: "scrollHor" },
        ],
      },
      { view: "scrollbar", id: "scrollVer" },
    ],
  };
  chart.templates.task_text = (_s, _e, t) => escapeText(t.text);
  chart.templates.grid_folder = () => "";
  chart.templates.grid_file = () => "";
  chart.templates.task_class = (_s, _e, t) =>
    `status-${t.status}${t.critical ? " task-critical" : ""}`;
  chart.templates.timeline_cell_class = (_t, date) =>
    date.getDay() === 0 || date.getDay() === 6 ? "weekend" : "";
  chart.templates.scale_cell_class = (date) =>
    date.getDay() === 0 || date.getDay() === 6 ? "weekend" : "";
  chart.templates.tooltip_text = (_s, _e, t) =>
    `<div class="plan-tooltip"><strong>${escapeText(t.text)}</strong><span>${escapeText(labels[t.status])} · ${Math.round((t.progress || 0) * 100)}%</span><span>${escapeText(t.owners || "未分配负责人")}</span></div>`;
  chart.attachEvent("onBeforeLightbox", (id) => {
    edit(id);
    return false;
  });
  chart.attachEvent("onTaskDblClick", (id) => {
    edit(id);
    return false;
  });
  chart.attachEvent("onTaskClick", (id) => {
    const t = props.tasks.find((t) => t.id === Number(id));
    if (t) emit("task-click", t);
    return true;
  });
  chart.attachEvent("onBeforeTaskDisplay", (id) =>
    visibleIds.value.has(Number(id)),
  );
  chart.attachEvent("onBeforeTaskDelete", () => false);
  chart.attachEvent("onBeforeTaskAdd", () => false);
  chart.attachEvent(
    "onBeforeLinkAdd",
    (_id, link) =>
      !busy.value &&
      !props.readonly &&
      Object.values(linkTypes).includes(String(link.type)),
  );
  chart.attachEvent("onAfterTaskDrag", (id) => {
    if (syncing || !props.saveTask) return;
    const t = chart.getTask(id);
    if (!t.start_date || !t.end_date) return;
    const patch = toTaskPatch({
      start_date: t.start_date,
      end_date: t.end_date,
      progress: t.progress || 0,
      type: t.type,
    });
    void persist(() => props.saveTask!(Number(id), patch));
  });
  chart.attachEvent("onAfterLinkAdd", (_id, link) => {
    if (syncing || !props.addDependency) return;
    const type = (Object.keys(linkTypes) as DependencyType[]).find(
      (k) => linkTypes[k] === String(link.type),
    );
    if (!type) {
      draw();
      return;
    }
    void persist(() =>
      props.addDependency!(Number(link.target), {
        depends_on_task_id: Number(link.source),
        type,
      }),
    );
  });
  chart.attachEvent("onLinkDblClick", (id) => {
    if (props.readonly || busy.value || !props.removeDependency) return false;
    const link = chart.getLink(id);
    dialog.warning({
      title: "删除任务依赖",
      content: "删除后，两项任务将不再关联。",
      positiveText: "删除依赖",
      negativeText: "取消",
      onPositiveClick: () =>
        persist(() => props.removeDependency!(Number(link.target), Number(id))),
    });
    return false;
  });
  chart.attachEvent("onGanttRender", () => {
    updateToday();
    return true;
  });
  chart.init(host.value!);
  scale();
  draw();
  if (props.showToday) today();
  observer = new ResizeObserver(() => chart?.setSizes());
  observer.observe(host.value!);
});
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  chart?.destructor();
});
</script>
<template>
  <div class="gantt-panel" :aria-busy="busy">
    <div class="gantt-toolbar">
      <div class="toolbar">
        <NButtonGroup size="small"
          ><NButton
            v-for="v in ['day', 'week', 'month'] as ViewMode[]"
            :key="v"
            :type="mode === v ? 'primary' : 'default'"
            :secondary="mode === v"
            @click="mode = v"
            >{{ { day: "日", week: "周", month: "月" }[v] }}</NButton
          ></NButtonGroup
        ><span class="toolbar-separator" /><NButton
          size="small"
          quaternary
          @click="today"
          ><template #icon><CalendarCheck /></template>今天</NButton
        ><NButton
          size="small"
          quaternary
          aria-label="展开全部任务"
          @click="expand(true)"
          ><template #icon><ChevronsUpDown /></template></NButton
        ><NButton
          size="small"
          quaternary
          aria-label="折叠全部任务"
          @click="expand(false)"
          ><template #icon><ChevronsDownUp /></template
        ></NButton>
      </div>
      <div class="toolbar">
        <NTag v-if="busy" size="small" :bordered="false" type="info"
          >正在保存</NTag
        ><NSelect
          v-model:value="status"
          :options="statuses"
          clearable
          placeholder="全部状态"
          size="small"
          style="width: 120px"
        /><NInput
          v-model:value="search"
          clearable
          placeholder="查找任务"
          size="small"
          style="width: 180px"
          ><template #prefix><Search :size="14" /></template
        ></NInput>
      </div>
    </div>
    <div ref="host" class="gantt-host" aria-label="项目甘特图" />
    <div class="gantt-footer">
      <span>{{ tasks.length }} 项任务</span>
      <div class="legend">
        <span><i class="not-started" />未开始</span
        ><span><i class="in-progress" />进行中</span
        ><span><i class="done" />已完成</span
        ><span><i class="blocked" />已阻塞</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.gantt-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}
.gantt-toolbar {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.toolbar-separator {
  height: 18px;
  width: 1px;
  background: var(--line);
  margin: 0 3px;
}
.gantt-host {
  flex: 1;
  min-height: 200px;
  min-width: 0;
}
.gantt-footer {
  padding: 9px 16px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 11px;
  flex-shrink: 0;
}
.legend {
  display: flex;
  gap: 18px;
}
.legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend i {
  width: 6px;
  height: 6px;
  border-radius: 2px;
}
.not-started {
  background: #99a8bc;
}
.in-progress {
  background: #3567d6;
}
.done {
  background: #1f8a70;
}
.blocked {
  background: #db8358;
}
</style>
<style>
.gantt-host {
  --dhx-gantt-font-family:
    -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  --dhx-gantt-base-colors-primary: #3567d6;
  --dhx-gantt-base-colors-border: #e5eaf1;
  --dhx-gantt-task-background: #99a8bc;
  --dhx-gantt-task-border: #99a8bc;
  --dhx-gantt-task-text: #fff;
}
.gantt-host .gantt_grid_scale,
.gantt-host .gantt_task_scale {
  background: #f9fafc;
  color: #738197;
  border-color: #e5eaf1;
  font-size: 11px;
}
.gantt-host .gantt_grid_data .gantt_cell {
  font-size: 12px;
  color: #34445d;
}
.gantt-host .gantt_task_line {
  border-radius: 4px;
}
.gantt-host .gantt_task_content {
  font-size: 11px;
  font-weight: 500;
}
.gantt-host .gantt_row,
.gantt-host .gantt_task_row {
  border-color: #edf0f5;
}
.gantt-host .gantt_row.odd,
.gantt-host .gantt_task_row.odd {
  background: #fcfdff;
}
.gantt-host .weekend {
  background: #f4f6fa;
}
.gantt-host .gantt_selected .gantt_task_cell {
  background: #edf2fd;
}
.gantt-host .status-IN_PROGRESS {
  --dhx-gantt-task-background: #3567d6;
  --dhx-gantt-task-border: #3567d6;
}
.gantt-host .status-DONE {
  --dhx-gantt-task-background: #1f8a70;
  --dhx-gantt-task-border: #1f8a70;
}
.gantt-host .status-BLOCKED {
  --dhx-gantt-task-background: #db8358;
  --dhx-gantt-task-border: #db8358;
}
.gantt-host .task-critical {
  box-shadow: 0 0 0 2px #d36a69;
}
.gantt-host .gantt_task_progress {
  opacity: 0.3;
}
.gantt-host .gantt_task_link .gantt_line_wrapper div {
  background: #94a4bc;
}
.gantt-host .today-marker {
  background: #dc7181;
  opacity: 0.7;
  width: 1px;
}
.gantt-host .gantt_marker_content {
  background: #dc7181;
  font-size: 10px;
}
.plan-tooltip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.plan-tooltip span {
  color: #738197;
}
.gantt_tooltip {
  border: 1px solid #e5eaf1 !important;
  border-radius: 6px !important;
  box-shadow: 0 6px 24px #24344d15 !important;
}
</style>

<style>
.gantt-host .gantt-today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed #d87687;
  z-index: 4;
  pointer-events: none;
}
.gantt-host .gantt-today span {
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 10px;
  color: #c55e71;
  white-space: nowrap;
}
</style>

<style>
.gantt-host .gantt_row.gantt_selected,
.gantt-host .gantt_row.odd.gantt_selected {
  background: #edf2fd;
}
.gantt-host .gantt_grid_data .gantt_row.gantt_selected .gantt_cell {
  box-shadow: none;
}
</style>
