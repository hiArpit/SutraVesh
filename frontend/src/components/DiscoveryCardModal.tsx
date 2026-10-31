import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X, Link as LinkIcon, Compass } from 'lucide-react'
import type { HopResponse } from '../types/game'

interface Props {
  isOpen: boolean
  cardData: HopResponse | null
  onClose: () => void
}

export default function DiscoveryCardModal({ isOpen, cardData, onClose }: Props) {
  if (!isOpen || !cardData || !cardData.new_node) return null

  const node = cardData.new_node
  const conceptName = node.label || 'Discovered Wonder'
  const whatIsIt = cardData.what_is_it || node.what_is_it || node.description || `A wonderful ${conceptName} discovered in your surroundings!`
  const funFact = cardData.fun_fact || node.fun_fact || `Every ${conceptName} holds amazing secrets in nature, science, and everyday life.`
  const tryThis = cardData.try_this || node.try_this || `Take a moment to look closely at this ${conceptName}. Notice its shape and texture!`
  const gradeLevel = cardData.grade_level || node.grade_level || 'Grade 1.3'
  const isConnected = cardData.new_edges && cardData.new_edges.length > 0
  const firstEdge = isConnected ? cardData.new_edges[0] : null
  const connectionRule = cardData.connection_rule || firstEdge?.connection_rule || (isConnected ? 'Purpose & Teamwork' : null)

  const sourceName = firstEdge?.source ? firstEdge.source.replace(/_/g, ' ') : null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white border-2 border-orange-100 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-colors"
            title="Close and view on map"
          >
            <X size={18} />
          </button>

          {/* Sparkle Header Icon & Title */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-3xl bg-amber-100/70 text-amber-500 flex items-center justify-center text-3xl shadow-sm mb-2">
              ✨
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight capitalize">
              {conceptName}
            </h2>
            {cardData.points_awarded > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                <Sparkles size={12} />
                +{cardData.points_awarded} Discovery Points
              </span>
            )}
          </div>

          {/* Dedicated Connection Explanation Box */}
          <div className="mb-5">
            {isConnected ? (
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-orange-100/60 border-2 border-orange-200 rounded-2xl p-4 shadow-sm text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs shadow-sm">
                      <LinkIcon size={14} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-orange-900">
                      Why They Connect
                    </h3>
                  </div>
                  {connectionRule && connectionRule !== 'None' && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-200/90 text-orange-900 border border-orange-300">
                      {connectionRule}
                    </span>
                  )}
                </div>

                {sourceName && (
                  <div className="inline-flex items-center gap-2 text-xs font-black text-slate-800 mb-2 bg-white/80 px-3 py-1 rounded-xl border border-orange-100 shadow-2xs">
                    <span className="capitalize">{sourceName}</span>
                    <span className="text-orange-500 font-bold">⟷</span>
                    <span className="capitalize">{conceptName}</span>
                  </div>
                )}

                <p className="text-xs sm:text-sm font-bold text-orange-950 leading-relaxed">
                  {cardData.reason || firstEdge?.relationship || `Connected together through ${connectionRule || 'a real-world link'}!`}
                </p>
              </div>
            ) : (
              <div className="bg-sky-50 border-2 border-sky-200/80 rounded-2xl p-4 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs shadow-sm">
                    <Compass size={14} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-900">
                    New Island Wonder Placed!
                  </h3>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                  Sitting on its own island. Discover a wonder that works with, powers, or lives near <span className="font-bold text-slate-900">{conceptName}</span> to weave a connecting thread!
                </p>
              </div>
            )}
          </div>

          {/* 3 Dedicated Information Boxes */}
          <div className="space-y-3 mb-6 text-left">
            {/* Box 1: What is it? (Pale Blue) */}
            <div className="bg-sky-50/90 border border-sky-100 rounded-2xl p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 mb-1">
                What is it?
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                {whatIsIt}
              </p>
            </div>

            {/* Box 2: Fun fact (Pale Amber) */}
            <div className="bg-amber-50/90 border border-amber-100 rounded-2xl p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                <span>☀️</span>
                <span>Fun fact</span>
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                {funFact}
              </p>
            </div>

            {/* Box 3: Try this (Pale Green) */}
            <div className="bg-emerald-50/90 border border-emerald-100 rounded-2xl p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 mb-1 flex items-center gap-1.5">
                <span>👀</span>
                <span>Try this</span>
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
                {tryThis}
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span>📖</span>
              <span className="capitalize">{conceptName}</span>
            </div>
            <span className="text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
              {gradeLevel}
            </span>
          </div>

          {/* Primary CTA button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>View on Discovery Map</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
