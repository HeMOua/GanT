<script setup lang="ts">
import { h, ref, onMounted } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import {
  NButton,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NTag,
  NEmpty,
  NAlert,
  useMessage,
  useDialog,
  type DataTableColumns,
} from "naive-ui";
import { Plus } from "@lucide/vue";
import api from "../api/client";
const desktop = isTauri(),
  message = useMessage(),
  dialog = useDialog();
const users = ref<any[]>([]),
  loading = ref(false),
  show = ref(false),
  saving = ref(false),
  failed = ref(false);
const draft = ref({
  username: "",
  display_name: "",
  password: "",
  role: "USER",
});
const columns: DataTableColumns<any> = [
  {
    title: "成员",
    key: "display_name",
    render: (u) =>
      h("div", { class: "member-name" }, [
        h(
          "span",
          { class: "member-avatar" },
          (u.display_name || u.username || "成").slice(0, 1),
        ),
        h("strong", u.display_name || u.username),
      ]),
  },
  ...(!desktop
    ? ([
        { title: "账号", key: "username" },
        {
          title: "权限",
          key: "role",
          render: (u: any) =>
            h(
              NTag,
              {
                size: "small",
                bordered: false,
                type: u.role === "ADMIN" ? "info" : "default",
              },
              () => (u.role === "ADMIN" ? "管理员" : "成员"),
            ),
        },
        {
          title: "操作",
          key: "actions",
          render: (u: any) =>
            h(
              NButton,
              { size: "small", quaternary: true, onClick: () => toggle(u) },
              () => "切换权限",
            ),
        },
      ] as DataTableColumns<any>)
    : []),
  {
    title: "加入日期",
    key: "created_at",
    width: 160,
    render: (u) =>
      u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "—",
  },
];
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    users.value = (await api.get("/users")).data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
async function create() {
  if (
    !draft.value.display_name.trim() ||
    (!desktop && !draft.value.username.trim())
  ) {
    message.warning("请填写必填信息");
    return;
  }
  saving.value = true;
  try {
    await api.post("/users", draft.value);
    show.value = false;
    draft.value = {
      username: "",
      display_name: "",
      password: "",
      role: "USER",
    };
    await load();
    message.success("成员已添加");
  } catch {
    message.error("添加失败，请检查信息后重试");
  } finally {
    saving.value = false;
  }
}
function toggle(u: any) {
  const role = u.role === "ADMIN" ? "USER" : "ADMIN";
  dialog.warning({
    title: "修改成员权限",
    content: "确认修改该成员的权限？",
    positiveText: "确认修改",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await api.patch(`/users/${u.id}/role`, { role });
        await load();
      } catch {
        message.error("修改失败");
      }
    },
  });
}
</script>
<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">成员管理</h1>
        <p class="page-subtitle">
          {{ desktop ? "维护项目的任务负责人" : "维护团队成员与访问权限" }}
        </p>
      </div>
      <NButton type="primary" @click="show = true"
        ><template #icon><Plus /></template>添加成员</NButton
      >
    </header>
    <div class="page-content">
      <p class="section-caption">共 {{ users.length }} 位成员</p>
      <NAlert v-if="failed" type="error" title="成员加载失败"
        ><NButton text @click="load">重新加载</NButton></NAlert
      ><NDataTable
        :columns="columns"
        :data="users"
        :loading="loading"
        :bordered="false"
        :row-key="(u) => u.id"
        ><template #empty
          ><NEmpty description="添加成员后，即可为任务指派负责人" /></template
      ></NDataTable>
    </div>
    <NModal
      v-model:show="show"
      preset="card"
      title="添加成员"
      style="width: 440px"
      ><NForm label-placement="top" @submit.prevent="create"
        ><NFormItem label="姓名" required
          ><NInput
            v-model:value="draft.display_name"
            placeholder="输入成员姓名" /></NFormItem
        ><template v-if="!desktop"
          ><NFormItem label="登录账号" required
            ><NInput v-model:value="draft.username" /></NFormItem
          ><NFormItem label="初始密码"
            ><NInput
              v-model:value="draft.password"
              type="password"
              show-password-on="click" /></NFormItem
          ><NFormItem label="权限"
            ><NSelect
              v-model:value="draft.role"
              :options="[
                { label: '成员', value: 'USER' },
                { label: '管理员', value: 'ADMIN' },
              ]" /></NFormItem
        ></template>
        <div style="display: flex; justify-content: flex-end; gap: 10px">
          <NButton @click="show = false">取消</NButton
          ><NButton type="primary" attr-type="submit" :loading="saving"
            >添加成员</NButton
          >
        </div></NForm
      ></NModal
    >
  </section>
</template>
<style>
.member-name {
  display: flex;
  align-items: center;
  gap: 12px;
}
.member-name strong {
  font-weight: 500;
}
.member-avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #edf2fd;
  color: #3567d6;
}
</style>
