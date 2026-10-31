import { useState, useCallback } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import confetti from 'canvas-confetti'
import type { PlayMode, HopVerdict, EurekaGraph, GameNode, GameEdge } from '../types/game'
import { createSession, submitHop, submitImageHop } from '../api/client'

// Converts backend GameNode → React Flow Node
function toFlowNode(gNode: GameNode, index: number): Node {
  const angle = (index * 2 * Math.PI) / 6
  const radius = 180 + Math.floor(index / 6) * 90
  return {
    id: gNode.id,
    type: 'bubble',
    position: {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    },
    data: {
      label: gNode.label,
      category: gNode.category,
      description: gNode.description,
      image_url: gNode.image_url,
    },
  }
}

// Converts backend GameEdge → React Flow Edge
function toFlowEdge(gEdge: GameEdge): Edge {
  const colorMap: Record<string, string> = {
    established: '#10b981', // emerald green
    association: '#f59e0b', // amber yellow
    resonance: '#38bdf8',   // light blue
  }
  return {
    id: `${gEdge.source}-${gEdge.target}`,
    source: gEdge.source,
    target: gEdge.target,
    label: gEdge.relationship.slice(0, 30),
    style: { stroke: colorMap[gEdge.support] ?? '#a78bfa', strokeWidth: 2 },
    animated: gEdge.support === 'established',
  }
}

export function useGameSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<PlayMode>('quest')
  const [questTarget, setQuestTarget] = useState<string | undefined>()
  const [activeLevelNumber, setActiveLevelNumber] = useState<number | null>(null)
  const [currentNode, setCurrentNode] = useState<string>('')

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [loading, setLoading] = useState(false)
  const [totalPoints, setTotalPoints] = useState(0)
  const [hopsCount, setHopsCount] = useState(0)
  const [badges, setBadges] = useState<string[]>([])
  const [lastVerdict, setLastVerdict] = useState<HopVerdict | null>(null)
  const [lastReason, setLastReason] = useState('')
  const [lastPoints, setLastPoints] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [eurekaGraph, setEurekaGraph] = useState<EurekaGraph | null>(null)

  const startSession = useCallback(async (
    m: PlayMode, seed: string, target?: string, levelNumber?: number
  ) => {
    setLoading(true)
    try {
      const res = await createSession(m, seed, target)
      setSessionId(res.session_id)
      setMode(m)
      setQuestTarget(target)
      setActiveLevelNumber(levelNumber ?? null)
      setCurrentNode(seed.toLowerCase().replace(/ /g, '_'))

      const seedNode: Node = {
        id: seed.toLowerCase().replace(/ /g, '_'),
        type: 'bubble',
        position: { x: 400, y: 300 },
        data: { label: seed, category: 'general', description: '' },
      }
      setNodes([seedNode])
      setEdges([])
      setTotalPoints(0)
      setHopsCount(0)
      setBadges([])
      setLastVerdict(null)
      setCompleted(false)
      setEurekaGraph(null)
    } finally {
      setLoading(false)
    }
  }, [setNodes, setEdges])

  const applyHopResponse = useCallback((res: Awaited<ReturnType<typeof submitHop>>) => {
    setLastVerdict(res.verdict)
    setLastReason(res.reason)
    setLastPoints(res.points_awarded)
    setTotalPoints(res.total_points)
    setHopsCount(h => h + (res.valid ? 1 : 0))
    setBadges(prev => {
      const next = [...prev]
      res.badges_unlocked.forEach(b => { if (!next.includes(b)) next.push(b) })
      return next
    })

    if (res.new_node) {
      const idx = nodes.length
      setNodes(ns => [...ns, toFlowNode(res.new_node!, idx)])
      setCurrentNode(res.new_node.id)
    }
    if (res.new_edges.length > 0) {
      setEdges(es => [...es, ...res.new_edges.map(toFlowEdge)])
    }

    // Quest Level completion and lock progression
    if (res.completed && res.eureka_graph) {
      setCompleted(true)
      setEurekaGraph(res.eureka_graph)
      if (activeLevelNumber) {
        const currentUnlocked = Number(localStorage.getItem('sutravesh_max_level') || '1')
        const nextLevel = Math.max(currentUnlocked, activeLevelNumber + 1)
        localStorage.setItem('sutravesh_max_level', String(nextLevel))
      }
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#a78bfa','#22d3ee','#fbbf24', '#10b981'] })
    } else if (res.valid && activeLevelNumber && [1, 2, 3].includes(activeLevelNumber)) {
      // Tier 1 casual discovery (1-hop): any valid discovery successfully clears the level!
      setCompleted(true)
      const currentUnlocked = Number(localStorage.getItem('sutravesh_max_level') || '1')
      const nextLevel = Math.max(currentUnlocked, activeLevelNumber + 1)
      localStorage.setItem('sutravesh_max_level', String(nextLevel))
      const victoryTarget = res.new_node ? res.new_node.label : 'Discovery'
      setEurekaGraph({
        nodes: [
          ...nodes.map(n => ({ id: n.id, label: (n.data as any).label, category: 'general', description: '' })),
          ...(res.new_node ? [res.new_node] : [])
        ],
        edges: [...res.new_edges],
        quest_title: `Level ${activeLevelNumber} Discovery Cleared!`,
        target_concept: victoryTarget,
        hops_taken: 1,
        hops_saved: 0,
        total_bonus_points: res.total_points,
      })
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#a78bfa','#22d3ee','#fbbf24', '#10b981'] })
    }
  }, [nodes, activeLevelNumber, setNodes, setEdges])

  // ── Text hop: concept + explanation ─────────────────────────────────────────
  const handleTextHop = useCallback(async (concept: string, explanation: string) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await submitHop(
        sessionId,
        mode,
        explanation,
        currentNode,
        concept.toLowerCase().replace(/ /g, '_')
      )
      applyHopResponse(res)
    } finally {
      setLoading(false)
    }
  }, [sessionId, mode, currentNode, applyHopResponse])

  // ── Image hop ────────────────────────────────────────────────────────────────
  const handleImageHop = useCallback(async (explanation: string, file: File) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await submitImageHop(
        sessionId,
        mode,
        explanation,
        file,
        currentNode,
        questTarget?.toLowerCase().replace(/ /g, '_')
      )
      applyHopResponse(res)
    } finally {
      setLoading(false)
    }
  }, [sessionId, mode, currentNode, questTarget, applyHopResponse])

  const reset = useCallback(() => {
    setSessionId(null)
    setActiveLevelNumber(null)
    setNodes([])
    setEdges([])
    setCompleted(false)
    setEurekaGraph(null)
  }, [setNodes, setEdges])

  return {
    sessionId, mode, questTarget, activeLevelNumber, currentNode,
    nodes, edges, onNodesChange, onEdgesChange,
    loading, totalPoints, hopsCount, badges,
    lastVerdict, lastReason, lastPoints,
    completed, eurekaGraph,
    startSession, handleTextHop, handleImageHop, reset,
  }
}
