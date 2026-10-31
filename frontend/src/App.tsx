import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

import { useGameSession } from './hooks/useGameSession'
import ModeSelector from './components/ModeSelector'
import HopInput from './components/HopInput'
import ScorePanel from './components/ScorePanel'
import EurekaCard from './components/EurekaCard'
import BubbleNode from './components/BubbleNode'
import AuthModal from './components/AuthModal'
import DiscoveryCardModal from './components/DiscoveryCardModal'
import { getMeApi, logoutApi } from './api/client'
import type { UserProfile } from './types/game'

const NODE_TYPES = { bubble: BubbleNode }

function AutoFitView({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (nodeCount > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.35, duration: 600, maxZoom: 1.15 })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [nodeCount, fitView])
  return null
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

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
    sessionId, mode, questTarget, activeLevelNumber, currentNode,
    nodes, edges, onNodesChange, onEdgesChange,
    loading, totalPoints, cumulativePoints, hopsCount, badges,
    lastVerdict, lastReason, lastPoints,
    completed, eurekaGraph,
    lastCardResponse, isCardModalOpen, setIsCardModalOpen,
    startSession, startSessionWithImage, exploreDiscoveryMap, handleTextHop, handleImageHop, reset,
  } = useGameSession(currentUser)

  const goHome = useCallback(() => {
    if (nodes.length > 1 && !completed) {
      if (!window.confirm('Return to Home? Your discovery trail is saved in your points!')) {
        return
      }
    }
    if (window.location.hash !== '#home') {
      window.history.pushState({ screen: 'home' }, '', '#home')
    }
    reset()
  }, [nodes.length, completed, reset])

  // Handle browser back button (popstate) to return home or close card instead of exiting site
  useEffect(() => {
    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState({ screen: 'home' }, '', '#home')
    }

    const handlePopState = () => {
      const hash = window.location.hash
      if (!hash || hash === '#home') {
        if (sessionId) {
          reset()
        }
        setIsCardModalOpen(false)
      } else if (hash === '#map') {
        setIsCardModalOpen(false)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [sessionId, reset, setIsCardModalOpen])

  // ── Landing screen ──────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-40">
          <AuthModal
            user={currentUser}
            onAuthChange={setCurrentUser}
            onLogout={handleLogout}
            isOpenExternal={isAuthOpen}
            onOpenChange={setIsAuthOpen}
          />
        </div>
        <ModeSelector
          onStart={startSession}
          onCaptureImage={startSessionWithImage}
          onExploreMap={exploreDiscoveryMap}
          onOpenAuth={() => setIsAuthOpen(true)}
          loading={loading}
          currentUser={currentUser}
        />
      </div>
    )
  }

  // ── Game screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#FAF6EE] overflow-hidden">
      {/* Top right auth widget */}
      <div className="absolute top-4 right-84 z-30">
        <AuthModal
          user={currentUser}
          onAuthChange={setCurrentUser}
          onLogout={handleLogout}
          isOpenExternal={isAuthOpen}
          onOpenChange={setIsAuthOpen}
        />
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
          <AutoFitView nodeCount={nodes.length} />
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
        {/* Header with Clickable Logo to return Home */}
        <div className="flex items-center justify-between pb-3 border-b border-orange-100">
          <div
            onClick={goHome}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity group"
            title="Click logo to return Home"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              🔍
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-none group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                <span>SutraVesh</span>
                <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200">
                  🏠 Home
                </span>
              </h1>
              <p className="text-[11px] font-bold text-orange-600 mt-0.5">
                {mode === 'quest'
                  ? (activeLevelNumber ? `🎯 Quest Level ${activeLevelNumber}` : '🎯 Quest Challenge')
                  : '🗺️ Personal Discovery Map'}
              </p>
            </div>
          </div>
          <button
            onClick={goHome}
            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Start new trail"
          >
            ✕ New Trail
          </button>
        </div>

        <ScorePanel
          totalPoints={totalPoints}
          cumulativePoints={cumulativePoints}
          activeLevelNumber={activeLevelNumber}
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
        onClose={() => {
          if (window.location.hash === '#card') {
            window.history.back()
          }
          setIsCardModalOpen(false)
        }}
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
