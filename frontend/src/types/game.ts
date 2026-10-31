// ── TypeScript contracts mirroring backend Pydantic schemas ──────────────────

export type PlayMode = 'quest' | 'world'
export type HopVerdict = 'established' | 'association' | 'rejected'
export type EdgeSupport = 'established' | 'association' | 'resonance'

export interface GameNode {
  id: string
  label: string
  category: string
  description: string
  island_id?: string | null
  image_url?: string | null
}

export interface GameEdge {
  source: string
  target: string
  relationship: string
  support: EdgeSupport
  evidence_urls: string[]
}

export interface EurekaGraph {
  nodes: GameNode[]
  edges: GameEdge[]
  quest_title: string
  target_concept: string
  hops_taken: number
  hops_saved: number
  total_bonus_points: number
}

export interface HopResponse {
  valid: boolean
  verdict: HopVerdict
  reason: string
  detected_object?: string | null
  new_node?: GameNode | null
  new_edges: GameEdge[]
  resonance_count: number
  resonance_points: number
  points_awarded: number
  total_points: number
  badges_unlocked: string[]
  completed: boolean
  eureka_graph?: EurekaGraph | null
  new_island_created: boolean
}

export interface SessionState {
  session_id: string
  mode: PlayMode
  seed_concept: string
  quest_target?: string | null
  total_points: number
  hops_taken: number
  badges: string[]
  completed: boolean
}

export interface QuestLevel {
  level_number: number
  tier: number
  tier_name: string
  title: string
  description: string
  starting_seed: string
  target_wonder?: string | null
  emoji: string
  target_emoji?: string | null
  required_hops: number
  clues: string[]
  stars_reward: number
}
