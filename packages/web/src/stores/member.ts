import { defineStore } from 'pinia'
import { ref } from 'vue'
import { membersApi, type Member } from '../api/members'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const loading = ref(false)

  async function fetchMembers() {
    loading.value = true
    try {
      members.value = await membersApi.getAll()
    } finally {
      loading.value = false
    }
  }

  async function createMember(data: Partial<Member>) {
    const newMember = await membersApi.create(data)
    members.value.push(newMember)
    return newMember
  }

  async function updateMember(id: number, data: Partial<Member>) {
    const updated = await membersApi.update(id, data)
    const index = members.value.findIndex(m => m.id === id)
    if (index !== -1) {
      members.value[index] = { ...members.value[index], ...updated }
    }
    return updated
  }

  async function deleteMember(id: number) {
    await membersApi.delete(id)
    members.value = members.value.filter(m => m.id !== id)
  }

  return {
    members,
    loading,
    fetchMembers,
    createMember,
    updateMember,
    deleteMember
  }
})
