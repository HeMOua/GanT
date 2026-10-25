<script setup lang="ts">
import { ref } from "vue";
import { NCard, NForm, NFormItem, NInput, NButton, NAlert } from "naive-ui";
import { ChartNoAxesGantt } from "@lucide/vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const username = ref("");
const password = ref("");
const displayName = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function handleSubmit() {
  if (!username.value || !password.value) {
    errorMsg.value = "请输入用户名和密码";
    return;
  }

  errorMsg.value = "";
  loading.value = true;

  try {
    if (isLogin.value) {
      await authStore.login({
        username: username.value,
        password: password.value,
      });
    } else {
      await authStore.register({
        username: username.value,
        password: password.value,
        display_name: displayName.value || username.value,
      });
    }
    router.push("/");
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || "操作失败，请重试";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-brand">
        <ChartNoAxesGantt :size="26" /><strong>GanT</strong>
      </div>
      <NCard :title="isLogin ? '登录工作区' : '创建账号'"
        ><NForm @submit.prevent="handleSubmit"
          ><NFormItem v-if="!isLogin" label="姓名"
            ><NInput
              v-model:value="displayName"
              placeholder="输入姓名" /></NFormItem
          ><NFormItem label="用户名"
            ><NInput
              v-model:value="username"
              placeholder="输入用户名" /></NFormItem
          ><NFormItem label="密码"
            ><NInput
              v-model:value="password"
              type="password"
              show-password-on="click"
              placeholder="输入密码" /></NFormItem
          ><NAlert v-if="errorMsg" type="error" style="margin-bottom: 20px">{{
            errorMsg
          }}</NAlert
          ><NButton
            type="primary"
            attr-type="submit"
            block
            :loading="loading"
            >{{ isLogin ? "登录" : "注册" }}</NButton
          ><NButton
            text
            style="display: block; margin: 20px auto 0"
            @click="
              isLogin = !isLogin;
              errorMsg = '';
            "
            >{{ isLogin ? "创建新账号" : "返回登录" }}</NButton
          ></NForm
        ></NCard
      >
    </div>
  </div>
</template>
<style scoped>
.login-page {
  display: grid;
  place-items: center;
  height: 100%;
  background: var(--page);
}
.login-panel {
  width: 380px;
}
.login-brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: var(--blue);
  margin-bottom: 28px;
}
.login-brand strong {
  font-size: 26px;
  letter-spacing: -1px;
}
</style>
