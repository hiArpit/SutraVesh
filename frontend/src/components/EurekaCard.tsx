import { motion } from 'framer-motion'
import { Trophy, Share2 } from 'lucide-react'
import type { EurekaGraph } from '../types/game'

interface Props {
  graph: EurekaGraph
  onPlayAgain: () => void
}

export default function EurekaCard({ graph, onPlayAgain }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white border-2 border-orange-200 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Trophy header */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-3 shadow-inner"
          >
            <Trophy size={46} className="text-amber-500" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 text-center tracking-tight">Eureka!</h2>
          <p className="text-xs font-bold text-orange-600 mt-1 text-center uppercase tracking-wider">
            {graph.quest_title || 'Discovery Trail Complete!'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Total Points" value={graph.total_bonus_points} color="text-amber-500" />
          <Stat label="Wonders Found" value={graph.hops_taken} color="text-orange-600" />
          <Stat label="Goal" value={graph.target_concept} color="text-emerald-600" small />
        </div>

        {/* Concept path */}
        <div className="mb-6">
          <p className="text-[11px] text-slate-400 mb-2.5 font-bold uppercase tracking-wider">
            Your Discovery Path
          </p>
          <div className="flex flex-wrap gap-2">
            {graph.nodes.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1.5">
                <span className="bg-orange-50 border border-orange-200 text-orange-900 text-xs px-2.5 py-1 rounded-full font-bold">
                  {n.label}
                </span>
                {i < graph.nodes.length - 1 && (
                  <span className="text-orange-400 font-bold text-xs">→</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm py-3.5 rounded-2xl shadow-md border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer"
          >
            Explore Another Trail 🚀
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'SutraVesh — Small questions. Big discoveries.',
                  text: `I discovered ${graph.hops_taken} wonders and scored ${graph.total_bonus_points} points on SutraVesh!`,
                  url: window.location.href,
                }).catch(() => {})
              }
            }}
            className="p-3.5 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
            title="Share Discovery"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function Stat({ label, value, color, small = false }: {
  label: string; value: string | number; color: string; small?: boolean
}) {
  return (
    <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3 text-center">
      <p className={`${small ? 'text-xs' : 'text-2xl'} font-black ${color} truncate`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}
