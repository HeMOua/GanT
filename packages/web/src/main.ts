import { isTauri } from '@tauri-apps/api/core'
import { showMessage } from './api/dialogs'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

if (isTauri()) {
  app.config.errorHandler = error => {
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message) : '操作失败，请重试'
    void showMessage(message)
  }
}

app.use(createPinia())
app.use(router)

app.mount('#app')
