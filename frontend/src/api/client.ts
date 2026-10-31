import axios from 'axios'
import type { HopResponse, PlayMode, GameNode, GameEdge } from '../types/game'

const BASE = '/api'

// Add auth header interceptor
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('sutravesh_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auth APIs ────────────────────────────────────────────────────────────────
export async function registerApi(username: string, password: string, displayName?: string) {
  const { data } = await axios.post(`${BASE}/auth/register`, {
    username,
    password,
    display_name: displayName,
  })
  if (data.access_token) {
    localStorage.setItem('sutravesh_token', data.access_token)
  }
  return data
}

export async function loginApi(username: string, password: string) {
  const { data } = await axios.post(`${BASE}/auth/login`, {
    username,
    password,
  })
  if (data.access_token) {
    localStorage.setItem('sutravesh_token', data.access_token)
  }
  return data
}

export async function getMeApi() {
  const token = localStorage.getItem('sutravesh_token')
  if (!token) return null
  try {
    const { data } = await axios.get(`${BASE}/auth/me`)
    return data
  } catch {
    localStorage.removeItem('sutravesh_token')
    return null
  }
}

export function logoutApi() {
  localStorage.removeItem('sutravesh_token')
}

export async function updateUserProgressApi(params: {
  total_score?: number
  quests_completed?: number
  max_level?: number
}) {
  const token = localStorage.getItem('sutravesh_token')
  if (!token) return null
  try {
    const { data } = await axios.post(`${BASE}/auth/progress`, params)
    return data
  } catch (err) {
    console.error('Failed to sync user progress to backend', err)
    return null
  }
}

export async function getUserMapApi() {
  const token = localStorage.getItem('sutravesh_token')
  if (!token) return { nodes: [], edges: [] }
  try {
    const { data } = await axios.get(`${BASE}/auth/map`)
    return data as { nodes: any[]; edges: any[] }
  } catch (err) {
    console.warn('Failed to load user map from backend', err)
    return { nodes: [], edges: [] }
  }
}

export async function saveUserMapApi(nodes: any[], edges: any[]) {
  const token = localStorage.getItem('sutravesh_token')
  if (!token) return null
  try {
    const { data } = await axios.post(`${BASE}/auth/map`, { nodes, edges })
    return data
  } catch (err) {
    console.warn('Failed to save user map to backend', err)
    return null
  }
}

// ── Game Session APIs ────────────────────────────────────────────────────────
export async function createSession(
  mode: PlayMode,
  seedConcept: string,
  questTarget?: string
) {
  const { data } = await axios.post(`${BASE}/session`, {
    mode,
    seed_concept: seedConcept,
    quest_target: questTarget ?? null,
  })
  return data as { session_id: string; mode: string; message: string }
}

export async function submitHop(
  sessionId: string,
  mode: PlayMode,
  explanation: string,
  sourceNodeId?: string,
  targetNodeId?: string
): Promise<HopResponse> {
  const { data } = await axios.post(`${BASE}/hop`, {
    session_id: sessionId,
    mode,
    explanation,
    source_node_id: sourceNodeId ?? null,
    target_node_id: targetNodeId ?? null,
  })
  return data
}

export async function submitImageHop(
  sessionId: string,
  mode: PlayMode,
  explanation: string,
  imageFile: File,
  sourceNodeId?: string,
  questTargetId?: string
): Promise<HopResponse> {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('mode', mode)
  form.append('explanation', explanation)
  if (sourceNodeId) form.append('source_node_id', sourceNodeId)
  if (questTargetId) form.append('target_node_id', questTargetId)
  form.append('image', imageFile)

  const { data } = await axios.post(`${BASE}/hop/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function discoverConcepts(sessionId: string, seed: string) {
  const { data } = await axios.post(
    `${BASE}/discover?session_id=${encodeURIComponent(sessionId)}&seed=${encodeURIComponent(seed)}`
  )
  return data as { seed_node: GameNode; related_nodes: GameNode[]; edges: GameEdge[] }
}

// ── Quest Levels APIs ────────────────────────────────────────────────────────
export async function listQuestLevelsApi() {
  const { data } = await axios.get(`${BASE}/quests/levels`)
  return data as { levels: import('../types/game').QuestLevel[]; total_levels: number }
}

export async function startQuestLevelApi(levelNumber: number) {
  const { data } = await axios.post(`${BASE}/quests/start-level`, {
    level_number: levelNumber,
  })
  return data as {
    session_id: string
    level_number: number
    title: string
    mode: PlayMode
    starting_seed: string
    quest_target?: string | null
    clues: string[]
  }
}
