import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

import { useGameSession } from './hooks/useGameSession'
import ModeSelector from './components/ModeSelector'
import HopInput from './components/HopInput'
import ScorePanel from './components/ScorePanel'
import EurekaCard from './components/EurekaCard'
import BubbleNode from './components/BubbleNode'
import AuthModal from './components/AuthModal'
import { getMeApi, logoutApi } from './api/client'

const NODE_TYPES = { bubble: BubbleNode }

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; display_name: string } | null>(null)

  useEffect(() => {
    getMeApi().then(user => {
      if (user) setCurrentUser(user)
    })
  }, [])

  const handleLogout = () => {
    logoutApi()
    setCurrentUser(null)
  }

  const {
    sessionId, mode, questTarget, currentNode,
    nodes, edges, onNodesChange, onEdgesChange,
    loading, totalPoints, hopsCount, badges,
    lastVerdict, lastReason, lastPoints,
    completed, eurekaGraph,
    startSession, handleTextHop, handleImageHop, reset,
  } = useGameSession()

  // ── Landing screen ──────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-40">
          <AuthModal user={currentUser} onAuthChange={setCurrentUser} onLogout={handleLogout} />
        </div>
        <ModeSelector onStart={startSession} />
      </div>
    )
  }

  // ── Game screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Top right auth widget */}
      <div className="absolute top-4 right-76 z-30">
        <AuthModal user={currentUser} onAuthChange={setCurrentUser} onLogout={handleLogout} />
      </div>

      {/* LEFT: Graph canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          className="bg-slate-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#334155"
          />
          <Controls className="!bg-slate-800 !border-slate-700" />
          <MiniMap
            className="!bg-slate-900 !border-slate-700"
            nodeColor="#7c3aed"
            maskColor="rgba(2,6,23,0.7)"
          />
        </ReactFlow>

        {/* Bottom: Hop input bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <HopInput
            onTextHop={handleTextHop}
            onImageHop={handleImageHop}
            loading={loading}
            disabled={completed}
            currentNode={currentNode}
            targetNode={questTarget}
            mode={mode}
          />
        </div>
      </div>

      {/* RIGHT: Score panel */}
      <div className="w-72 border-l border-slate-800 p-4 overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white">WonderLens</h1>
            <p className="text-xs text-slate-500">
              {mode === 'quest' ? '🏹 Chain Hunt' : '🌍 Divergent Islands'}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            ✕ Exit
          </button>
        </div>

        <ScorePanel
          totalPoints={totalPoints}
          hopsCount={hopsCount}
          badges={badges}
          lastVerdict={lastVerdict}
          lastReason={lastReason}
          lastPoints={lastPoints}
          mode={mode}
          questTarget={questTarget}
        />
      </div>

      {/* OVERLAY: Eureka card on quest completion */}
      <AnimatePresence>
        {completed && eurekaGraph && (
          <EurekaCard graph={eurekaGraph} onPlayAgain={reset} />
        )}
      </AnimatePresence>
    </div>
  )
}
