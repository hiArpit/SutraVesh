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
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500
        rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-yellow-500/20">

        {/* Trophy header */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Trophy size={56} className="text-yellow-400 mb-2" />
          </motion.div>
          <h2 className="text-2xl font-black text-white text-center">Eureka!</h2>
          <p className="text-sm text-slate-400 mt-1 text-center">{graph.quest_title}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Total Points" value={graph.total_bonus_points} color="text-yellow-400" />
          <Stat label="Hops Taken" value={graph.hops_taken} color="text-violet-400" />
          <Stat label="Target" value={graph.target_concept} color="text-cyan-400" small />
        </div>

        {/* Concept path */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
            Your Discovery Path
          </p>
          <div className="flex flex-wrap gap-2">
            {graph.nodes.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1">
                <span className="bg-violet-800 border border-violet-500 text-violet-200
                  text-xs px-2 py-1 rounded-full font-medium">
                  {n.label}
                </span>
                {i < graph.nodes.length - 1 && (
                  <span className="text-slate-600 text-xs">→</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold
              py-3 rounded-xl transition-colors"
          >
            Play Again 🚀
          </button>
          <button
            onClick={() => navigator.share?.({
              title: 'SutraVesh — WonderLens',
              text: `I scored ${graph.total_bonus_points} points in ${graph.hops_taken} hops!`,
              url: window.location.href,
            })}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
          >
            <Share2 size={18} className="text-slate-300" />
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
    <div className="bg-slate-900 rounded-xl p-3 text-center">
      <p className={`${small ? 'text-sm' : 'text-2xl'} font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}
