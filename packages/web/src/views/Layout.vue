<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <!-- 侧边导航 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="logo">📊</span>
        <span class="name">GanT</span>
      </div>

      <nav class="nav-menu">
        <router-link to="/" class="nav-item" exact-active-class="active">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          项目管理
        </router-link>
        <router-link v-if="authStore.user?.role === 'ADMIN'" to="/team" class="nav-item" exact-active-class="active">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          团队管理
        </router-link>
      </nav>

      <div class="user-profile">
        <div class="avatar">{{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}</div>
        <div class="user-info">
          <div class="username">{{ authStore.user?.display_name || authStore.user?.username }}</div>
          <div class="role">{{ authStore.user?.role === 'ADMIN' ? '管理员' : '成员' }}</div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f8fafc;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
}

.brand {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.brand .logo {
  font-size: 28px;
}

.brand .name {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.nav-menu {
  flex: 1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s ease;
}

.nav-item .icon {
  width: 20px;
  height: 20px;
}

.nav-item:hover:not(.disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.nav-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-profile {
  padding: 20px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c084fc, #3b82f6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.logout-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* 主内容区 */
.main-content {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 路由动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
