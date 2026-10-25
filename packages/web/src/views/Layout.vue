<script setup lang="ts">
import { isTauri, invoke } from "@tauri-apps/api/core";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NButton, NTag, useMessage } from "naive-ui";
import {
  ChartNoAxesGantt,
  FolderKanban,
  UsersRound,
  DatabaseBackup,
  LogOut,
  ChevronRight,
} from "@lucide/vue";
import { useAuthStore } from "../stores/auth";
const desktop = isTauri();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const message = useMessage();
const backingUp = ref(false);
async function backup() {
  backingUp.value = true;
  try {
    const result = await invoke<string>("backup_workspace");
    if (result) message.success(result);
  } catch {
    message.error("备份失败，请选择可写的文件夹和新的文件名");
  } finally {
    backingUp.value = false;
  }
}
function logout() {
  auth.logout();
  router.push("/login");
}
</script>
<template>
  <div class="workspace">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-symbol"><ChartNoAxesGantt :size="23" /></div>
        <div><strong>GanT</strong><span>项目工作台</span></div>
      </div>
      <div class="nav-caption">工作区</div>
      <nav>
        <RouterLink
          to="/"
          class="nav-item"
          :class="{ active: route.path !== '/team' }"
          ><FolderKanban :size="18" /><span>项目计划</span
          ><ChevronRight :size="14"
        /></RouterLink>
        <RouterLink
          v-if="auth.user?.role === 'ADMIN'"
          to="/team"
          class="nav-item"
          :class="{ active: route.path === '/team' }"
          ><UsersRound :size="18" /><span>成员管理</span
          ><ChevronRight :size="14"
        /></RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <NButton
          v-if="desktop"
          secondary
          block
          :loading="backingUp"
          @click="backup"
          ><template #icon><DatabaseBackup /></template>备份数据</NButton
        >
        <div class="profile">
          <div class="avatar">
            {{
              (auth.user?.display_name || auth.user?.username || "我").slice(
                0,
                1,
              )
            }}
          </div>
          <div class="profile-name">
            <strong>{{ auth.user?.display_name || auth.user?.username }}</strong
            ><NTag size="small" :bordered="false" type="success">{{
              desktop ? "本地工作区" : "在线工作区"
            }}</NTag>
          </div>
          <NButton
            v-if="!desktop"
            quaternary
            circle
            aria-label="退出登录"
            @click="logout"
            ><template #icon><LogOut /></template
          ></NButton>
        </div>
      </div>
    </aside>
    <main class="workspace-main"><RouterView /></main>
  </div>
</template>
<style scoped>
.workspace {
  display: flex;
  height: 100%;
  background: var(--page);
}
.sidebar {
  width: 208px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line);
  background: #fff;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 28px 22px 32px;
}
.brand-symbol {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--blue);
  color: #fff;
}
.brand strong {
  font-size: 21px;
  letter-spacing: -0.6px;
  line-height: 1.2;
  display: block;
}
.brand span {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 1.5px;
  display: block;
  margin-top: 3px;
}
.nav-caption {
  margin: 0 24px 10px;
  font-size: 10px;
  color: #8b97a9;
  letter-spacing: 1px;
}
nav {
  padding: 0 12px;
}
.nav-item {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  color: #617088;
  border-radius: 6px;
  margin-bottom: 5px;
  font-size: 13px;
}
.nav-item span {
  flex: 1;
}
.nav-item > svg:last-child {
  opacity: 0;
}
.nav-item.active {
  color: var(--blue);
  background: #edf2fd;
  font-weight: 600;
}
.nav-item.active > svg:last-child {
  opacity: 1;
}
.nav-item:hover {
  background: #f4f6fa;
}
.sidebar-bottom {
  margin-top: auto;
  padding: 16px;
}
.profile {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 9px;
  align-items: center;
}
.avatar {
  width: 32px;
  height: 32px;
  background: #e9eef9;
  color: var(--blue);
  display: grid;
  place-items: center;
  border-radius: 8px;
}
.profile-name {
  flex: 1;
  min-width: 0;
}
.profile-name strong {
  display: block;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.profile-name :deep(.n-tag) {
  font-size: 10px;
  height: 19px;
}
.workspace-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
