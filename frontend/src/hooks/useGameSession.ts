import { useState, useCallback, useEffect } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import confetti from 'canvas-confetti'
import type { PlayMode, HopVerdict, EurekaGraph, GameNode, GameEdge, HopResponse, UserProfile } from '../types/game'
import { createSession, submitHop, submitImageHop, updateUserProgressApi, getUserMapApi, saveUserMapApi } from '../api/client'

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

  const getMapNodesKey = (user?: UserProfile | null) =>
    user ? `sutravesh_user_${user.username}_map_nodes` : 'sutravesh_guest_map_nodes'

  const getMapEdgesKey = (user?: UserProfile | null) =>
    user ? `sutravesh_user_${user.username}_map_edges` : 'sutravesh_guest_map_edges'

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

  // Synchronize user profile & map when user signs in or changes
  useEffect(() => {
    setSessionId(null)
    setActiveLevelNumber(null)
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

    // Pre-fetch user map from MongoDB on login
    if (currentUser) {
      getUserMapApi().then(res => {
        if (res && res.nodes && res.nodes.length > 0) {
          const nodesKey = getMapNodesKey(currentUser)
          const edgesKey = getMapEdgesKey(currentUser)
          localStorage.setItem(nodesKey, JSON.stringify(res.nodes))
          localStorage.setItem(edgesKey, JSON.stringify(res.edges || []))
        }
      })
    }
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

  const applyHopResponse = useCallback(async (res: HopResponse) => {
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

    let updatedNodes = [...nodes]
    let updatedEdges = [...edges]

    if (res.new_node) {
      const idx = updatedNodes.length
      const newNode = toFlowNode(res.new_node, idx)
      if (!updatedNodes.some(n => n.id === newNode.id)) {
        updatedNodes = [...updatedNodes, newNode]
      }
      setCurrentNode(res.new_node.id)

      setLastCardResponse(res)
      window.history.pushState({ modal: 'card' }, '', '#card')
      setIsCardModalOpen(true)
    }

    if (res.new_edges && res.new_edges.length > 0) {
      const existingIds = new Set(updatedEdges.map(e => e.id))
      const newFlowEdges = res.new_edges
        .map(toFlowEdge)
        .filter(e => !existingIds.has(e.id))
      updatedEdges = [...updatedEdges, ...newFlowEdges]
    }

    setNodes(updatedNodes)
    setEdges(updatedEdges)

    // Persist directly to MongoDB for authenticated user
    const nodesKey = getMapNodesKey(currentUser)
    const edgesKey = getMapEdgesKey(currentUser)
    localStorage.setItem(nodesKey, JSON.stringify(updatedNodes))
    localStorage.setItem(edgesKey, JSON.stringify(updatedEdges))
    if (currentUser) {
      await saveUserMapApi(updatedNodes, updatedEdges)
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
  }, [nodes, edges, activeLevelNumber, currentUser, setNodes, setEdges])

  // ── Explore Discovery Map (User can explore map anytime) ─────────────────────
  const exploreDiscoveryMap = useCallback(async () => {
    setLoading(true)
    try {
      window.history.pushState({ screen: 'map' }, '', '#map')
      setMode('world')
      setQuestTarget(undefined)
      setActiveLevelNumber(null)
      setCompleted(false)
      setEurekaGraph(null)

      const nodesKey = getMapNodesKey(currentUser)
      const edgesKey = getMapEdgesKey(currentUser)
      let savedNodes: Node[] = []
      let savedEdges: Edge[] = []

      // 1. Primary: Fetch from MongoDB for authenticated user
      if (currentUser) {
        try {
          const remote = await getUserMapApi()
          if (remote && remote.nodes && remote.nodes.length > 0) {
            savedNodes = remote.nodes
            savedEdges = remote.edges || []
            localStorage.setItem(nodesKey, JSON.stringify(savedNodes))
            localStorage.setItem(edgesKey, JSON.stringify(savedEdges))
          }
        } catch (e) {
          console.warn('MongoDB map fetch error:', e)
        }
      }

      // 2. Fallback: local storage
      if (savedNodes.length === 0) {
        try {
          const localNodes = localStorage.getItem(nodesKey)
          const localEdges = localStorage.getItem(edgesKey)
          if (localNodes) savedNodes = JSON.parse(localNodes)
          if (localEdges) savedEdges = JSON.parse(localEdges)
        } catch (e) {
          console.warn('Error reading local map cache', e)
        }
      }

      // 3. If brand-new user with zero discoveries yet
      if (savedNodes.length === 0) {
        const initialNode: Node = {
          id: 'ready_to_discover',
          type: 'bubble',
          position: { x: 400, y: 300 },
          data: {
            label: 'Ready to Discover',
            category: 'general',
            description: 'Your map is ready! Snap any object in your room using the camera below to place your first wonder.',
            what_is_it: 'Your blank discovery canvas waiting for real-world wonders!',
            fun_fact: 'Every object you photograph gets woven into your personal discovery universe!',
            try_this: 'Tap the camera button below and snap a book, bottle, or plant!',
            grade_level: 'Grade 1.3',
          },
        }
        savedNodes = [initialNode]
      }

      const activeSeed = (savedNodes[0]?.data as any)?.label || 'Discovery'
      const sessionRes = await createSession('world', activeSeed)
      setSessionId(sessionRes.session_id)
      setNodes(savedNodes)
      setEdges(savedEdges)
      setCurrentNode(savedNodes[savedNodes.length - 1]?.id || 'ready_to_discover')
    } finally {
      setLoading(false)
    }
  }, [currentUser, setNodes, setEdges])

  // ── Start discovery session directly from landing lens capture ──────────────
  const startSessionWithImage = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const nodesKey = getMapNodesKey(currentUser)
      const edgesKey = getMapEdgesKey(currentUser)
      let existingNodes: Node[] = []
      let existingEdges: Edge[] = []

      // 1. Fetch from MongoDB first for logged-in user
      if (currentUser) {
        try {
          const remote = await getUserMapApi()
          if (remote && remote.nodes && remote.nodes.length > 0) {
            existingNodes = remote.nodes
            existingEdges = remote.edges || []
          }
        } catch (e) {
          console.warn('MongoDB map fetch error:', e)
        }
      }

      // 2. Fallback to localStorage if empty
      if (existingNodes.length === 0) {
        try {
          const localN = localStorage.getItem(nodesKey)
          const localE = localStorage.getItem(edgesKey)
          if (localN) existingNodes = JSON.parse(localN)
          if (localE) existingEdges = JSON.parse(localE)
        } catch {}
      }

      const seedConcept = existingNodes.length > 0 && (existingNodes[0].data as any)?.label
        ? (existingNodes[0].data as any).label
        : 'Wonder'

      const res = await createSession('world', seedConcept, undefined)
      window.history.pushState({ screen: 'map' }, '', '#map')
      setSessionId(res.session_id)
      setMode('world')
      setQuestTarget(undefined)
      setActiveLevelNumber(null)
      setCompleted(false)
      setEurekaGraph(null)

      const sourceId = existingNodes.length > 0 ? existingNodes[existingNodes.length - 1].id : undefined

      const hopRes = await submitImageHop(
        res.session_id,
        'world',
        'Discovered through the lens!',
        file,
        sourceId
      )

      let updatedNodes = [...existingNodes]
      let updatedEdges = [...existingEdges]

      if (hopRes.new_node) {
        const nextIdx = updatedNodes.length
        const newNode = toFlowNode(hopRes.new_node, nextIdx)
        if (!updatedNodes.some(n => n.id === newNode.id)) {
          updatedNodes.push(newNode)
        }
        setCurrentNode(hopRes.new_node.id)
      }

      if (hopRes.new_edges && hopRes.new_edges.length > 0) {
        const existingEdgeIds = new Set(updatedEdges.map(e => e.id))
        const newFlowEdges = hopRes.new_edges
          .map(toFlowEdge)
          .filter(e => !existingEdgeIds.has(e.id))
        updatedEdges = [...updatedEdges, ...newFlowEdges]
      }

      setNodes(updatedNodes)
      setEdges(updatedEdges)
      setLastVerdict(hopRes.verdict)
      setLastReason(hopRes.reason)
      setLastPoints(hopRes.points_awarded)
      setTotalPoints(hopRes.total_points)
      setHopsCount(updatedNodes.length)

      if (hopRes.points_awarded > 0) {
        setCumulativePoints(prev => {
          const nextPoints = prev + hopRes.points_awarded
          const pKey = getPointsKey(currentUser)
          localStorage.setItem(pKey, String(nextPoints))
          if (currentUser) {
            updateUserProgressApi({ total_score: nextPoints })
          }
          return nextPoints
        })
      }

      setLastCardResponse(hopRes)
      window.history.pushState({ modal: 'card' }, '', '#card')
      setIsCardModalOpen(true)

      // 3. Persist directly to MongoDB and local storage
      localStorage.setItem(nodesKey, JSON.stringify(updatedNodes))
      localStorage.setItem(edgesKey, JSON.stringify(updatedEdges))
      if (currentUser) {
        await saveUserMapApi(updatedNodes, updatedEdges)
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser, setNodes, setEdges])

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
      await applyHopResponse(res)
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
      await applyHopResponse(res)
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
    startSession, startSessionWithImage, exploreDiscoveryMap, handleTextHop, handleImageHop, reset,
  }
}
