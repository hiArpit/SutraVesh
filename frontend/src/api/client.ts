import axios from 'axios'
import type { HopResponse, PlayMode, GameNode, GameEdge } from '../types/game'

const BASE = '/api'

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
