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
import DiscoveryCardModal from './components/DiscoveryCardModal'
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
    lastCardResponse, isCardModalOpen, setIsCardModalOpen,
    startSession, startSessionWithImage, handleTextHop, handleImageHop, reset,
  } = useGameSession()

  // ── Landing screen ──────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-40">
          <AuthModal user={currentUser} onAuthChange={setCurrentUser} onLogout={handleLogout} />
        </div>
        <ModeSelector
          onStart={startSession}
          onCaptureImage={startSessionWithImage}
          loading={loading}
        />
      </div>
    )
  }

  // ── Game screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#FAF6EE] overflow-hidden">
      {/* Top right auth widget */}
      <div className="absolute top-4 right-84 z-30">
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
          className="bg-[#FAF6EE]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="#D5D9E2"
          />
          <Controls className="!bg-white !border-orange-100 !text-slate-700 !shadow-sm rounded-xl overflow-hidden" />
          <MiniMap
            className="!bg-white/90 !border-orange-200 !rounded-2xl !shadow-sm"
            nodeColor="#F97316"
            maskColor="rgba(250,246,238,0.7)"
          />
        </ReactFlow>

        {/* Bottom: Hop input bar */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
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
      <div className="w-80 bg-white/60 backdrop-blur-sm border-l-2 border-orange-100 p-5 overflow-y-auto flex flex-col gap-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
              🔍
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-none">SutraVesh</h1>
              <p className="text-[11px] font-bold text-orange-600 mt-0.5">
                {questTarget ? '🎯 Trail Quest' : '🌿 Discovery Trail'}
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
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

      {/* OVERLAY: Kid Discovery Card modal on object capture */}
      <DiscoveryCardModal
        isOpen={isCardModalOpen}
        cardData={lastCardResponse}
        onClose={() => setIsCardModalOpen(false)}
      />

      {/* OVERLAY: Eureka card on quest completion */}
      <AnimatePresence>
        {completed && eurekaGraph && (
          <EurekaCard graph={eurekaGraph} onPlayAgain={reset} />
        )}
      </AnimatePresence>
    </div>
  )
}
