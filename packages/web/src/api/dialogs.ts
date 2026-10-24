import { invoke, isTauri } from '@tauri-apps/api/core'

export async function confirmAction(message: string): Promise<boolean> {
  return isTauri() ? invoke<boolean>('confirm_action', { message }) : window.confirm(message)
}

export async function showMessage(message: string): Promise<void> {
  if (isTauri()) await invoke('show_message', { message })
  else window.alert(message)
}
