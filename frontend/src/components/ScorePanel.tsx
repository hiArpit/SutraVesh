import { motion, AnimatePresence } from 'framer-motion'
import { Star, Award } from 'lucide-react'
import type { HopVerdict } from '../types/game'

interface Props {
  totalPoints: number
  hopsCount: number
  badges: string[]
  lastVerdict?: HopVerdict | null
  lastReason?: string
  lastPoints?: number
  mode: 'quest' | 'world'
  questTarget?: string
}

const VERDICT_STYLE: Record<HopVerdict, string> = {
  established: 'bg-cyan-900 border-cyan-400 text-cyan-300',
  association:  'bg-violet-900 border-violet-400 text-violet-300',
  rejected:     'bg-red-900 border-red-400 text-red-300',
}

const VERDICT_EMOJI: Record<HopVerdict, string> = {
  established: '⚡',
  association:  '🔮',
  rejected:     '❌',
}

export default function ScorePanel({
  totalPoints, hopsCount, badges, lastVerdict, lastReason, lastPoints, mode, questTarget,
}: Props) {
  return (
    <div className="flex flex-col gap-3 w-64">
      {/* Score card */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-yellow-400" />
          <span className="text-sm font-semibold text-slate-300">Score</span>
        </div>
        <p className="text-4xl font-black text-white tabular-nums">{totalPoints}</p>
        <p className="text-xs text-slate-500 mt-1">{hopsCount} hop{hopsCount !== 1 ? 's' : ''} made</p>

        {mode === 'quest' && questTarget && (
          <div className="mt-3 p-2 bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-400">Quest target</p>
            <p className="text-sm font-bold text-violet-300">🎯 {questTarget}</p>
          </div>
        )}
      </div>

      {/* Last verdict feedback */}
      <AnimatePresence mode="wait">
        {lastVerdict && (
          <motion.div
            key={lastReason}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`rounded-2xl border p-3 text-sm ${VERDICT_STYLE[lastVerdict]}`}
          >
            <div className="flex items-center gap-2 mb-1 font-bold">
              <span>{VERDICT_EMOJI[lastVerdict]}</span>
              <span className="capitalize">{lastVerdict}</span>
              {lastPoints !== undefined && lastPoints > 0 && (
                <span className="ml-auto text-xs font-black">+{lastPoints}</span>
              )}
            </div>
            <p className="text-xs leading-relaxed opacity-90">{lastReason}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-yellow-400" />
            <span className="text-xs font-semibold text-slate-300">Badges</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {badges.map(b => (
              <motion.span
                key={b}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-0.5 rounded-full"
              >
                {b}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Points legend */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
        <div className="flex justify-between"><span>⚡ Established</span><span className="text-cyan-400 font-bold">+50</span></div>
        <div className="flex justify-between"><span>🔮 Association</span><span className="text-violet-400 font-bold">+30</span></div>
        {mode === 'world' && (
          <div className="flex justify-between"><span>🌀 Resonance (each)</span><span className="text-orange-400 font-bold">+15</span></div>
        )}
        <div className="flex justify-between"><span>❌ Rejected</span><span className="text-red-400 font-bold">+0</span></div>
      </div>
    </div>
  )
}
