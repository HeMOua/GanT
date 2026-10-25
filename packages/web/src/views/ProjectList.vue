<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  NButton,
  NInput,
  NCard,
  NTag,
  NProgress,
  NModal,
  NForm,
  NFormItem,
  NDatePicker,
  NEmpty,
  NSpin,
  NAlert,
  useMessage,
} from "naive-ui";
import {
  Plus,
  Search,
  ArrowUpRight,
  CalendarDays,
  FolderKanban,
} from "@lucide/vue";
import { useProjectStore } from "../stores/project";
import { useAuthStore } from "../stores/auth";
const store = useProjectStore();
const auth = useAuthStore();
const router = useRouter();
const message = useMessage();
const search = ref(""),
  show = ref(false),
  saving = ref(false),
  loadError = ref(false);
const draft = ref({
  name: "",
  description: "",
  start_date: null as string | null,
  end_date: null as string | null,
});
const filtered = computed(() =>
  store.projects.filter((p) =>
    `${p.name} ${p.description || ""}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
const totals = computed(() => ({
  active: store.projects.filter((p) => p.status === "ACTIVE").length,
  tasks: store.projects.reduce((n, p) => n + (p.totalTasks || 0), 0),
  done: store.projects.reduce((n, p) => n + (p.doneTasks || 0), 0),
}));
async function load() {
  loadError.value = false;
  try {
    await store.fetchProjects();
  } catch {
    loadError.value = true;
  }
}
onMounted(load);
async function create() {
  if (!draft.value.name.trim()) {
    message.warning("请输入项目名称");
    return;
  }
  if (
    draft.value.start_date &&
    draft.value.end_date &&
    draft.value.start_date > draft.value.end_date
  ) {
    message.warning("结束日期不能早于开始日期");
    return;
  }
  saving.value = true;
  try {
    await store.createProject({
      name: draft.value.name.trim(),
      description: draft.value.description,
      start_date: draft.value.start_date || undefined,
      end_date: draft.value.end_date || undefined,
    });
    show.value = false;
    draft.value = {
      name: "",
      description: "",
      start_date: null,
      end_date: null,
    };
    message.success("项目已创建");
  } catch {
    message.error("创建失败，请重试");
  } finally {
    saving.value = false;
  }
}
function progress(p: any) {
  return p.totalTasks
    ? Math.round(((p.doneTasks || 0) / p.totalTasks) * 100)
    : 0;
}
</script>
<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">项目计划</h1>
        <p class="page-subtitle">从计划到交付，掌握每一步进展</p>
      </div>
      <NButton
        v-if="auth.user?.role === 'ADMIN'"
        type="primary"
        @click="show = true"
        ><template #icon><Plus /></template>新建项目</NButton
      >
    </header>
    <div class="page-content">
      <div class="metric-strip">
        <div class="metric">
          <strong>{{ totals.active }}</strong
          ><span>进行中项目</span>
        </div>
        <div class="metric">
          <strong>{{ totals.tasks }}</strong
          ><span>计划任务</span>
        </div>
        <div class="metric">
          <strong>{{ totals.done }}</strong
          ><span>已完成任务</span>
        </div>
      </div>
      <div class="list-toolbar">
        <h2>
          所有项目 <span>{{ store.projects.length }}</span>
        </h2>
        <NInput
          v-model:value="search"
          placeholder="搜索项目"
          clearable
          style="width: 240px"
          ><template #prefix><Search :size="15" /></template
        ></NInput>
      </div>
      <NAlert v-if="loadError" type="error" title="项目加载失败"
        ><NButton text @click="load">重新加载</NButton></NAlert
      >
      <NSpin :show="store.loading"
        ><div v-if="filtered.length" class="project-grid">
          <NCard
            v-for="p in filtered"
            :key="p.id"
            hoverable
            class="project-card"
            @click="router.push(`/project/${p.id}`)"
            role="link"
            tabindex="0"
            @keydown.enter="router.push(`/project/${p.id}`)"
          >
            <div class="card-heading">
              <div class="folder"><FolderKanban :size="20" /></div>
              <NTag
                :type="p.status === 'ACTIVE' ? 'info' : 'default'"
                size="small"
                :bordered="false"
                >{{ p.status === "ACTIVE" ? "进行中" : "已归档" }}</NTag
              ><ArrowUpRight :size="17" class="open-arrow" />
            </div>
            <h3>{{ p.name }}</h3>
            <p class="description">{{ p.description || "暂无项目描述" }}</p>
            <div class="progress-label">
              <span>任务完成度</span
              ><strong>{{ progress(p) }}<small>%</small></strong>
            </div>
            <NProgress
              type="line"
              :percentage="progress(p)"
              :show-indicator="false"
              :height="5"
              :color="progress(p) === 100 ? '#1f8a70' : '#3567d6'"
            />
            <div class="card-footer">
              <span
                >{{ p.doneTasks || 0 }} / {{ p.totalTasks || 0 }} 项任务</span
              ><span
                ><CalendarDays :size="12" />{{
                  p.end_date || "未设截止日期"
                }}</span
              >
            </div>
          </NCard>
        </div>
        <NEmpty
          v-else-if="!store.loading && !loadError"
          :description="
            search ? '没有匹配的项目' : '创建第一个项目，开始安排任务'
          "
          style="padding: 100px 0"
          ><template #extra
            ><NButton
              v-if="!search && auth.user?.role === 'ADMIN'"
              @click="show = true"
              >新建项目</NButton
            ></template
          ></NEmpty
        ></NSpin
      >
    </div>
    <NModal
      v-model:show="show"
      preset="card"
      title="新建项目"
      style="width: 500px"
      :mask-closable="!saving"
    >
      <NForm label-placement="top" @submit.prevent="create"
        ><NFormItem label="项目名称" required
          ><NInput
            v-model:value="draft.name"
            placeholder="输入项目名称"
            maxlength="200"
            autofocus /></NFormItem
        ><NFormItem label="项目描述"
          ><NInput
            v-model:value="draft.description"
            type="textarea"
            placeholder="目标、范围或交付内容"
            :rows="3"
        /></NFormItem>
        <div class="form-grid">
          <NFormItem label="开始日期"
            ><NDatePicker
              v-model:formatted-value="draft.start_date"
              value-format="yyyy-MM-dd"
              type="date"
              clearable /></NFormItem
          ><NFormItem label="截止日期"
            ><NDatePicker
              v-model:formatted-value="draft.end_date"
              value-format="yyyy-MM-dd"
              type="date"
              clearable
          /></NFormItem>
        </div>
        <div class="modal-actions">
          <NButton :disabled="saving" @click="show = false">取消</NButton
          ><NButton type="primary" attr-type="submit" :loading="saving"
            >创建项目</NButton
          >
        </div></NForm
      >
    </NModal>
  </section>
</template>
<style scoped>
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 18px;
}
.list-toolbar h2 {
  font-size: 14px;
  font-weight: 600;
}
.list-toolbar h2 span {
  margin-left: 8px;
  color: var(--muted);
  font-weight: 400;
}
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
  gap: 18px;
}
.project-card {
  cursor: pointer;
  transition: border-color 0.15s;
}
.project-card:focus-visible {
  outline: 2px solid var(--blue);
}
.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.folder {
  background: #edf2fd;
  color: var(--blue);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.open-arrow {
  margin-left: auto;
  color: #9aa7ba;
}
.project-card h3 {
  font-size: 16px;
  font-weight: 600;
}
.description {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
  margin: 8px 0 24px;
  height: 40px;
  overflow: hidden;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 10px;
}
.progress-label strong {
  color: var(--ink);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.progress-label small {
  font-size: 11px;
  font-weight: 400;
  margin-left: 2px;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.card-footer span:last-child {
  display: flex;
  align-items: center;
  gap: 5px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
