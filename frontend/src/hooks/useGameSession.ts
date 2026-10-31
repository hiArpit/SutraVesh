import { useState, useCallback, useEffect } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import confetti from 'canvas-confetti'
import type { PlayMode, HopVerdict, EurekaGraph, GameNode, GameEdge, HopResponse, UserProfile } from '../types/game'
import { createSession, submitHop, submitImageHop, updateUserProgressApi } from '../api/client'

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
      what_is_it: gNode.what_is_it,
      fun_fact: gNode.fun_fact,
      try_this: gNode.try_this,
      grade_level: gNode.grade_level,
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
    label: (gEdge.relationship || '').slice(0, 36),
    type: 'smoothstep',
    style: { stroke: colorMap[gEdge.support] ?? '#f59e0b', strokeWidth: 3.5 },
    animated: true,
    labelStyle: { fill: '#1e293b', fontWeight: 800, fontSize: 11 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#fed7aa', strokeWidth: 1.5, rx: 8, ry: 8 },
    labelBgPadding: [6, 8],
  }
}

export function useGameSession(currentUser?: UserProfile | null) {
  const getPointsKey = (user?: UserProfile | null) =>
    user ? `sutravesh_user_${user.username}_total_explorer_points` : 'sutravesh_guest_total_explorer_points'

  const getLevelKey = (user?: UserProfile | null) =>
    user ? `sutravesh_user_${user.username}_max_level` : 'sutravesh_guest_max_level'

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<PlayMode>('quest')
  const [questTarget, setQuestTarget] = useState<string | undefined>()
  const [activeLevelNumber, setActiveLevelNumber] = useState<number | null>(null)
  const [currentNode, setCurrentNode] = useState<string>('')

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const [loading, setLoading] = useState(false)
  const [totalPoints, setTotalPoints] = useState(0)
  const [cumulativePoints, setCumulativePoints] = useState<number>(() => {
    const key = currentUser ? `sutravesh_user_${currentUser.username}_total_explorer_points` : 'sutravesh_guest_total_explorer_points'
    const backendScore = currentUser?.total_score ?? 0
    const localScore = Number(localStorage.getItem(key) || String(backendScore))
    return Math.max(backendScore, localScore)
  })
  const [hopsCount, setHopsCount] = useState(0)
  const [badges, setBadges] = useState<string[]>([])
  const [lastVerdict, setLastVerdict] = useState<HopVerdict | null>(null)
  const [lastReason, setLastReason] = useState('')
  const [lastPoints, setLastPoints] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [eurekaGraph, setEurekaGraph] = useState<EurekaGraph | null>(null)

  // Kid Discovery Card popup state
  const [lastCardResponse, setLastCardResponse] = useState<HopResponse | null>(null)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)

  // Switch/Reset in-memory canvas and load user-specific points when login/logout changes
  useEffect(() => {
    setSessionId(null)
    setActiveLevelNumber(null)
    setNodes([])
    setEdges([])
    setCompleted(false)
    setEurekaGraph(null)
    setLastCardResponse(null)
    setIsCardModalOpen(false)

    const key = getPointsKey(currentUser)
    const backendScore = currentUser?.total_score ?? 0
    const localScore = Number(localStorage.getItem(key) || String(backendScore))
    const finalScore = Math.max(backendScore, localScore)
    setCumulativePoints(finalScore)
    localStorage.setItem(key, String(finalScore))
  }, [currentUser?.username])

  const startSession = useCallback(async (
    m: PlayMode, seed: string, target?: string, levelNumber?: number
  ) => {
    setLoading(true)
    try {
      const res = await createSession(m, seed, target)
      window.history.pushState({ screen: 'map' }, '', '#map')
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
      setLastCardResponse(null)
      setIsCardModalOpen(false)
    } finally {
      setLoading(false)
    }
  }, [setNodes, setEdges])

  const applyHopResponse = useCallback((res: HopResponse) => {
    setLastVerdict(res.verdict)
    setLastReason(res.reason)
    setLastPoints(res.points_awarded)
    setTotalPoints(res.total_points)
    if (res.points_awarded > 0) {
      setCumulativePoints(prev => {
        const nextPoints = prev + res.points_awarded
        const pKey = getPointsKey(currentUser)
        localStorage.setItem(pKey, String(nextPoints))
        if (currentUser) {
          updateUserProgressApi({ total_score: nextPoints })
        }
        return nextPoints
      })
    }
    setHopsCount(h => h + (res.valid ? 1 : 0))
    setBadges(prev => {
      const next = [...prev]
      res.badges_unlocked.forEach(b => { if (!next.includes(b)) next.push(b) })
      return next
    })

    if (res.new_node) {
      const idx = nodes.length
      setNodes(ns => {
        // Prevent duplicate node IDs
        if (ns.some(n => n.id === res.new_node!.id)) return ns
        return [...ns, toFlowNode(res.new_node!, idx)]
      })
      setCurrentNode(res.new_node.id)

      // Open kid discovery card
      setLastCardResponse(res)
      window.history.pushState({ modal: 'card' }, '', '#card')
      setIsCardModalOpen(true)
    }

    if (res.new_edges && res.new_edges.length > 0) {
      setEdges(es => {
        const existingIds = new Set(es.map(e => e.id))
        const newFlowEdges = res.new_edges
          .map(toFlowEdge)
          .filter(e => !existingIds.has(e.id))
        return [...es, ...newFlowEdges]
      })
    }

    // Quest Level completion and lock progression
    if (res.completed && res.eureka_graph) {
      setCompleted(true)
      setEurekaGraph(res.eureka_graph)
      if (activeLevelNumber) {
        const lKey = getLevelKey(currentUser)
        const currentUnlocked = Number(localStorage.getItem(lKey) || String(currentUser?.max_level || 1))
        const nextLevel = Math.max(currentUnlocked, activeLevelNumber + 1)
        localStorage.setItem(lKey, String(nextLevel))
        if (currentUser) {
          updateUserProgressApi({ max_level: nextLevel })
        }
      }
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#a78bfa','#22d3ee','#fbbf24', '#10b981'] })
    } else if (res.valid && res.new_edges && res.new_edges.length > 0 && activeLevelNumber && [1, 2, 3].includes(activeLevelNumber)) {
      // Tier 1 casual discovery (1-hop): any valid discovery successfully clears the level!
      setCompleted(true)
      const lKey = getLevelKey(currentUser)
      const currentUnlocked = Number(localStorage.getItem(lKey) || String(currentUser?.max_level || 1))
      const nextLevel = Math.max(currentUnlocked, activeLevelNumber + 1)
      localStorage.setItem(lKey, String(nextLevel))
      if (currentUser) {
        updateUserProgressApi({ max_level: nextLevel })
      }
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
  }, [nodes, activeLevelNumber, currentUser, setNodes, setEdges])

  // ── Start discovery session directly from landing lens capture ──────────────
  const startSessionWithImage = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const res = await createSession('world', 'Wonder', undefined)
      window.history.pushState({ screen: 'map' }, '', '#map')
      setSessionId(res.session_id)
      setMode('world')
      setQuestTarget(undefined)
      setActiveLevelNumber(null)
      setNodes([])
      setEdges([])
      setTotalPoints(0)
      setHopsCount(0)
      setBadges([])
      setCompleted(false)
      setEurekaGraph(null)

      const hopRes = await submitImageHop(
        res.session_id,
        'world',
        'First wonder discovered through the lens!',
        file
      )

      if (hopRes.new_node) {
        const firstNode: Node = {
          id: hopRes.new_node.id,
          type: 'bubble',
          position: { x: 400, y: 300 },
          data: {
            label: hopRes.new_node.label,
            category: hopRes.new_node.category,
            description: hopRes.new_node.description,
            image_url: hopRes.new_node.image_url,
            what_is_it: hopRes.what_is_it,
            fun_fact: hopRes.fun_fact,
            try_this: hopRes.try_this,
            grade_level: hopRes.grade_level,
          },
        }
        setNodes([firstNode])
        setCurrentNode(hopRes.new_node.id)
      }
      setLastVerdict(hopRes.verdict)
      setLastReason(hopRes.reason)
      setLastPoints(hopRes.points_awarded)
      setTotalPoints(hopRes.total_points)
      setHopsCount(1)
      setLastCardResponse(hopRes)
      window.history.pushState({ modal: 'card' }, '', '#card')
      setIsCardModalOpen(true)
    } finally {
      setLoading(false)
    }
  }, [setNodes, setEdges])

  // ── Text hop: concept (AI automatically answers why they connect) ───────────
  const handleTextHop = useCallback(async (concept: string, explanation?: string) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await submitHop(
        sessionId,
        mode,
        explanation || `Discovered ${concept} in the surrounding world.`,
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
    setLastCardResponse(null)
    setIsCardModalOpen(false)
  }, [setNodes, setEdges])

  return {
    sessionId, mode, questTarget, activeLevelNumber, currentNode,
    nodes, edges, onNodesChange, onEdgesChange,
    loading, totalPoints, hopsCount, badges,
    lastVerdict, lastReason, lastPoints,
    completed, eurekaGraph,
    cumulativePoints, lastCardResponse, isCardModalOpen, setIsCardModalOpen,
    startSession, startSessionWithImage, handleTextHop, handleImageHop, reset,
  }
}
