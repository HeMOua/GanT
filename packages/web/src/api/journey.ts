import api from './client'
export interface Journey {
  id: number
  kind: 'participation' | 'work' | 'milestone'
  parent_id: number | null
  project_name: string
  person: string
  is_self: boolean
  title: string
  role: string
  start: string
  end: string
  tracking: 'following' | 'cutoff' | 'ended'
  cutoff: string
  approximate: boolean
  tags: string
  notes: string
}
export const journeyApi = {
  all: () => api.get<Journey[]>('/journeys').then(r => r.data),
  save: (v: Journey) => (v.id ? api.patch(`/journeys/${v.id}`, v) : api.post('/journeys', v)).then(r => r.data),
  remove: (id: number) => api.delete(`/journeys/${id}`),
}
