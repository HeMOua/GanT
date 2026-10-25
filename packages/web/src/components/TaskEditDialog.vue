<script setup lang="ts">
import { ref, computed } from "vue";
import {
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NDatePicker,
  NSelect,
  NSlider,
  NSwitch,
  NColorPicker,
  NButton,
  NTag,
  NDivider,
  NAlert,
  useMessage,
} from "naive-ui";
import { Trash2, Plus, X } from "@lucide/vue";
import { useAuthStore } from "../stores/auth";
import { formatDay } from "./gantt/adapter";
const props = defineProps<{
  task: any | null;
  members: any[];
  allTasks: any[];
  saving?: boolean;
}>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", data: any): void;
  (e: "delete", id: number): void;
  (e: "add-assignee", taskId: number, userId: number): void;
  (e: "remove-assignee", taskId: number, assigneeId: number): void;
}>();
const auth = useAuthStore(),
  message = useMessage();
const isAdmin = computed(() => auth.user?.role === "ADMIN");
const canProgress = computed(
  () =>
    isAdmin.value ||
    props.task?.assignees?.some((a: any) => a.user_id === auth.user?.id),
);
const draft = ref({
  name: props.task?.name || "",
  start_time: props.task?.start_time || formatDay(new Date()),
  end_time: props.task?.end_time || formatDay(new Date()),
  progress: props.task?.progress || 0,
  status: props.task?.status || "NOT_STARTED",
  parent_id: props.task?.parent_id ?? null,
  color: props.task?.color || (null as string | null),
  is_milestone: props.task?.is_milestone || false,
  is_critical: props.task?.is_critical || false,
});
const assignee = ref<number | null>(null);
const statusOptions = [
  { label: "未开始", value: "NOT_STARTED" },
  { label: "进行中", value: "IN_PROGRESS" },
  { label: "已完成", value: "DONE" },
  { label: "已阻塞", value: "BLOCKED" },
];
const parents = computed(() =>
  props.allTasks
    .filter((t) => {
      let parent = t;
      const seen = new Set<number>();
      while (parent) {
        if (parent.id === props.task?.id || seen.has(parent.id)) return false;
        seen.add(parent.id);
        parent = props.allTasks.find((x) => x.id === parent.parent_id);
      }
      return true;
    })
    .map((t) => ({ label: t.name, value: t.id })),
);
const members = computed(() =>
  props.members
    .filter((m) => !props.task?.assignees?.some((a: any) => a.user_id === m.id))
    .map((m) => ({
      label: m.display_name || m.username || m.name,
      value: m.id,
    })),
);
function submit() {
  if (!draft.value.name.trim()) {
    message.warning("请输入任务名称");
    return;
  }
  if (
    !draft.value.start_time ||
    !draft.value.end_time ||
    draft.value.end_time < draft.value.start_time
  ) {
    message.warning("请选择有效的任务日期范围");
    return;
  }
  const data = isAdmin.value
    ? {
        ...draft.value,
        name: draft.value.name.trim(),
        color: draft.value.color || "",
      }
    : { progress: draft.value.progress, status: draft.value.status };
  emit("save", data);
}
function assign() {
  if (assignee.value && props.task) {
    emit("add-assignee", props.task.id, assignee.value);
    assignee.value = null;
  }
}
</script>
<template>
  <NDrawer
    :show="true"
    :width="460"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    @update:show="
      (value) => {
        if (!value) emit('close');
      }
    "
    ><NDrawerContent
      :title="task ? '编辑任务' : '添加任务'"
      closable
      :native-scrollbar="false"
    >
      <NForm id="task-form" label-placement="top" @submit.prevent="submit"
        ><NFormItem label="任务名称" required
          ><NInput
            v-model:value="draft.name"
            placeholder="输入任务名称"
            :disabled="!isAdmin"
            maxlength="300"
        /></NFormItem>
        <div class="form-grid">
          <NFormItem label="开始日期" required
            ><NDatePicker
              v-model:formatted-value="draft.start_time"
              value-format="yyyy-MM-dd"
              type="date"
              :disabled="!isAdmin" /></NFormItem
          ><NFormItem label="结束日期" required
            ><NDatePicker
              v-model:formatted-value="draft.end_time"
              value-format="yyyy-MM-dd"
              type="date"
              :disabled="!isAdmin"
          /></NFormItem>
        </div>
        <NDivider />
        <div class="form-grid">
          <NFormItem label="当前状态"
            ><NSelect
              v-model:value="draft.status"
              :options="statusOptions"
              :disabled="!canProgress" /></NFormItem
          ><NFormItem label="父任务"
            ><NSelect
              v-model:value="draft.parent_id"
              :options="parents"
              clearable
              placeholder="根任务"
              :disabled="!isAdmin"
          /></NFormItem>
        </div>
        <NFormItem :label="`完成进度 · ${draft.progress}%`"
          ><NSlider
            v-model:value="draft.progress"
            :step="1"
            :disabled="!canProgress"
        /></NFormItem>
        <div class="task-toggles">
          <label
            ><span>里程碑</span
            ><NSwitch
              v-model:value="draft.is_milestone"
              :disabled="!isAdmin"
              size="small" /></label
          ><label
            ><span>关键任务</span
            ><NSwitch
              v-model:value="draft.is_critical"
              :disabled="!isAdmin"
              size="small"
          /></label>
        </div>
        <NFormItem label="任务颜色"
          ><NColorPicker
            v-model:value="draft.color"
            :modes="['hex']"
            :show-alpha="false"
            :disabled="!isAdmin"
            :swatches="['#3567d6', '#1f8a70', '#db8358', '#8671c7', '#99a8bc']"
            clearable /></NFormItem
        ><NDivider title-placement="left">负责人</NDivider>
        <div v-if="task" class="assignees">
          <div
            v-for="a in task.assignees || []"
            :key="a._assignee_id || a.id"
            class="assignee-row"
          >
            <NTag :bordered="false">{{
              a.name ||
              members.find((m) => m.value === a.user_id)?.label ||
              props.members.find((m) => m.id === a.user_id)?.display_name ||
              "未命名成员"
            }}</NTag
            ><NButton
              v-if="isAdmin"
              quaternary
              circle
              size="tiny"
              aria-label="移除负责人"
              @click="emit('remove-assignee', task.id, a._assignee_id ?? a.id)"
              ><template #icon><X /></template
            ></NButton>
          </div>
          <div v-if="isAdmin" class="toolbar">
            <NSelect
              v-model:value="assignee"
              :options="members"
              placeholder="选择负责人"
              filterable
              clearable
            /><NButton :disabled="!assignee" @click="assign"
              ><template #icon><Plus /></template>指派</NButton
            >
          </div>
        </div>
        <NAlert v-else :show-icon="false" type="info"
          >保存任务后可指派负责人。</NAlert
        > </NForm
      ><template #footer
        ><div class="drawer-footer">
          <NButton
            v-if="task && isAdmin"
            quaternary
            type="error"
            :disabled="saving"
            @click="emit('delete', task.id)"
            ><template #icon><Trash2 /></template>删除</NButton
          >
          <div class="toolbar">
            <NButton :disabled="saving" @click="emit('close')">取消</NButton
            ><NButton
              v-if="canProgress"
              type="primary"
              :loading="saving"
              attr-type="submit"
              form="task-form"
              >{{ task ? "保存修改" : "创建任务" }}</NButton
            >
          </div>
        </div></template
      >
    </NDrawerContent></NDrawer
  >
</template>
<style scoped>
.task-toggles {
  display: flex;
  gap: 30px;
  margin-bottom: 24px;
}
.task-toggles label {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
}
.drawer-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}
.drawer-footer > .toolbar {
  margin-left: auto;
}
.assignee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.assignees > .toolbar {
  margin-top: 16px;
}
</style>
