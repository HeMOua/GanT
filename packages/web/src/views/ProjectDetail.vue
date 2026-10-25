<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  NButton,
  NTag,
  NEmpty,
  NSpin,
  NAlert,
  useMessage,
  useDialog,
} from "naive-ui";
import { Plus, ArrowLeft, FlaskConical } from "@lucide/vue";
import { useProjectStore } from "../stores/project";
import { useTaskStore } from "../stores/task";
import { useAuthStore } from "../stores/auth";
import {
  GanttChart,
  type GanttTask,
  type DependencyType,
} from "../components/gantt";
import TaskEditDialog from "../components/TaskEditDialog.vue";
import api from "../api/client";
const props = defineProps<{ id: string }>();
const router = useRouter(),
  project = useProjectStore(),
  tasks = useTaskStore(),
  auth = useAuthStore(),
  message = useMessage(),
  dialog = useDialog();
const projectId = computed(() => Number(props.id)),
  isAdmin = computed(() => auth.user?.role === "ADMIN");
const selected = ref<any>(null),
  editing = ref(false),
  saving = ref(false),
  generating = ref(false),
  failed = ref(false),
  users = ref<any[]>([]);
const counts = computed(() => ({
  done: tasks.tasks.filter((t) => t.status === "DONE").length,
  active: tasks.tasks.filter((t) => t.status === "IN_PROGRESS").length,
}));
async function load() {
  failed.value = false;
  selected.value = null;
  editing.value = false;
  try {
    await project.fetchProjectById(projectId.value);
    await tasks.fetchTasks(projectId.value);
    if (isAdmin.value) users.value = (await api.get("/users")).data;
  } catch {
    failed.value = true;
  }
}
onMounted(load);
watch(projectId, load);
function edit(t: GanttTask) {
  selected.value = tasks.tasks.find((x) => x.id === t.id) || null;
  editing.value = !!selected.value;
}
function create() {
  selected.value = null;
  editing.value = true;
}
async function save(data: any) {
  if (saving.value) return;
  saving.value = true;
  try {
    if (selected.value)
      await tasks.updateTask(selected.value.id, data, projectId.value);
    else await tasks.createTask(projectId.value, data);
    editing.value = false;
    message.success("任务已保存");
  } catch (e: any) {
    message.error(e.response?.data?.message || "保存失败，请重试");
  } finally {
    saving.value = false;
  }
}
function remove(id: number) {
  dialog.warning({
    title: "删除任务",
    content: "该任务及其依赖将被删除，子任务会保留为根任务。",
    positiveText: "删除任务",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await tasks.deleteTask(id, projectId.value);
        editing.value = false;
        message.success("任务已删除");
      } catch {
        message.error("删除失败，请重试");
      }
    },
  });
}
async function assign(id: number, userId: number) {
  try {
    await tasks.addAssignee(id, { user_id: userId }, projectId.value);
    selected.value = tasks.tasks.find((x) => x.id === id);
  } catch {
    message.error("指派失败，请重试");
  }
}
async function unassign(id: number, assigneeId: number) {
  try {
    await tasks.removeAssignee(id, assigneeId, projectId.value);
    selected.value = tasks.tasks.find((x) => x.id === id);
  } catch {
    message.error("移除失败，请重试");
  }
}
function seed() {
  dialog.info({
    title: "添加演示任务",
    content: "向当前空项目添加三项示例任务及依赖。",
    positiveText: "添加演示任务",
    negativeText: "取消",
    onPositiveClick: async () => {
      generating.value = true;
      try {
        await project.seedProject(projectId.value);
        await tasks.fetchTasks(projectId.value);
      } catch {
        message.error("添加失败，请重试");
      } finally {
        generating.value = false;
      }
    },
  });
}
async function move(id: number, patch: any) {
  await tasks.updateTask(id, patch, projectId.value);
}
async function link(
  id: number,
  data: { depends_on_task_id: number; type: DependencyType; lag?: number },
) {
  await tasks.addDependency(id, data, projectId.value);
}
async function unlink(id: number, depId: number) {
  await tasks.removeDependency(id, depId, projectId.value);
}
</script>
<template>
  <section class="page project-detail">
    <header class="page-header">
      <div class="heading">
        <NButton
          quaternary
          circle
          aria-label="返回项目列表"
          @click="router.push('/projects')"
          ><template #icon><ArrowLeft /></template
        ></NButton>
        <div>
          <div class="title-row">
            <h1 class="page-title">
              {{
                project.currentProject?.id === projectId
                  ? project.currentProject.name
                  : "项目计划"
              }}
            </h1>
            <NTag size="small" :bordered="false" type="info">甘特视图</NTag>
          </div>
          <p class="page-subtitle">
            {{
              project.currentProject?.description ||
              "安排任务、连接依赖并跟踪交付进度"
            }}
          </p>
        </div>
      </div>
      <div class="toolbar">
        <NButton
          v-if="isAdmin && !tasks.tasks.length"
          :loading="generating"
          @click="seed"
          ><template #icon><FlaskConical /></template>演示任务</NButton
        ><NButton v-if="isAdmin" type="primary" @click="create"
          ><template #icon><Plus /></template>添加任务</NButton
        >
      </div>
    </header>
    <NAlert
      v-if="failed"
      type="error"
      title="项目加载失败"
      style="margin: 20px; width: auto"
      ><NButton text @click="load">重新加载</NButton></NAlert
    >
    <template v-else
      ><div class="project-summary">
        <span
          ><strong>{{ tasks.tasks.length }}</strong> 项任务</span
        ><span><i class="dot blue" />{{ counts.active }} 项进行中</span
        ><span><i class="dot green" />{{ counts.done }} 项已完成</span>
        <div class="summary-right">
          <span class="text-muted">计划周期</span
          ><span
            >{{ project.currentProject?.start_date || "未设置" }} —
            {{ project.currentProject?.end_date || "未设置" }}</span
          >
        </div>
      </div>
      <div class="chart-area">
        <NSpin
          v-if="tasks.loading && !tasks.tasks.length"
          style="display: grid; place-items: center; height: 100%"
        /><GanttChart
          v-else-if="tasks.tasks.length"
          :key="projectId"
          :tasks="tasks.tasks"
          :readonly="!isAdmin"
          :save-task="isAdmin ? move : undefined"
          :add-dependency="isAdmin ? link : undefined"
          :remove-dependency="isAdmin ? unlink : undefined"
          @task-dblclick="edit"
        />
        <div v-else class="empty-plan">
          <NEmpty description="还没有任务，先安排第一项工作"
            ><template #extra
              ><NButton v-if="isAdmin" @click="create"
                >添加任务</NButton
              ></template
            ></NEmpty
          >
        </div>
      </div></template
    >
    <TaskEditDialog
      v-if="editing"
      :task="selected"
      :members="users"
      :all-tasks="tasks.tasks"
      :saving="saving"
      @close="editing = false"
      @save="save"
      @delete="remove"
      @add-assignee="assign"
      @remove-assignee="unassign"
    />
  </section>
</template>
<style scoped>
.heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.title-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.page-subtitle {
  max-width: 650px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.project-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 15px 28px;
  font-size: 11px;
  color: #5d6e88;
  flex-shrink: 0;
}
.project-summary > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.project-summary strong {
  font-size: 15px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.dot {
  height: 6px;
  width: 6px;
  border-radius: 50%;
}
.blue {
  background: #3567d6;
}
.green {
  background: #1f8a70;
}
.summary-right {
  display: flex;
  gap: 12px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.chart-area {
  flex: 1;
  min-height: 0;
  padding: 0 20px 20px;
}
.empty-plan {
  height: 100%;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}
</style>
