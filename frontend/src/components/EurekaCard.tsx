import { motion } from 'framer-motion'
import { Trophy, Share2, Sparkles, CheckCircle2 } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden my-auto">
        {/* Trophy header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-18 h-18 rounded-full bg-amber-100 flex items-center justify-center mb-3 shadow-inner"
          >
            <Trophy size={42} className="text-amber-500" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Eureka!</h2>
          <p className="text-xs font-bold text-orange-600 mt-0.5 uppercase tracking-wider">
            {graph.quest_title || 'Discovery Trail Complete!'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <Stat label="Total Points" value={graph.total_bonus_points} color="text-amber-500" />
          <Stat label="Wonders Found" value={graph.hops_taken} color="text-orange-600" />
          <Stat label="Goal" value={graph.target_concept} color="text-emerald-600" small />
        </div>

        {/* Concept path */}
        <div className="mb-5 text-left">
          <p className="text-[11px] text-slate-400 mb-2 font-bold uppercase tracking-wider">
            Your Discovery Path
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {graph.nodes.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1.5">
                <span className="bg-orange-50 border border-orange-200 text-orange-900 text-xs px-3 py-1 rounded-full font-bold shadow-2xs">
                  {n.label}
                </span>
                {i < graph.nodes.length - 1 && (
                  <span className="text-orange-400 font-bold text-xs">➔</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Why They Connect — Dedicated Scientific Connection Explanation */}
        {graph.edges && graph.edges.length > 0 && (
          <div className="mb-6 text-left">
            <p className="text-[11px] text-slate-500 mb-2 font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Why They Connect</span>
            </p>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {graph.edges.map((edge, idx) => {
                const sourceLabel = graph.nodes.find(n => n.id === edge.source)?.label || edge.source
                const targetLabel = graph.nodes.find(n => n.id === edge.target)?.label || edge.target
                const rule = edge.connection_rule || 'Verified Science Link'
                const explanation = edge.relationship || `Grounded connection between ${sourceLabel} and ${targetLabel}.`

                return (
                  <div
                    key={`${edge.source}-${edge.target}-${idx}`}
                    className="p-3.5 bg-[#FAF6EE] border-2 border-orange-100/80 rounded-2xl"
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-orange-600 capitalize">{sourceLabel}</span>
                        <span className="text-slate-400">➔</span>
                        <span className="text-emerald-600 capitalize">{targetLabel}</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                        {rule}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      {explanation}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
            className="p-3.5 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0"
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
    <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-2.5 text-center">
      <p className={`${small ? 'text-xs' : 'text-xl sm:text-2xl'} font-black ${color} truncate`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}
