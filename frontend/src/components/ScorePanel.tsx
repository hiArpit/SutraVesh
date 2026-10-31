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
  established: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  association:  'bg-amber-50 border-amber-300 text-amber-900',
  rejected:     'bg-rose-50 border-rose-300 text-rose-900',
}

const VERDICT_EMOJI: Record<HopVerdict, string> = {
  established: '⚡',
  association:  '🔮',
  rejected:     '❌',
}

export default function ScorePanel({
  totalPoints, hopsCount, badges, lastVerdict, lastReason, lastPoints, mode: _mode, questTarget,
}: Props) {
  return (
    <div className="flex flex-col gap-3.5 w-72">
      {/* Score card */}
      <div className="bg-white rounded-3xl border-2 border-orange-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Star size={18} className="text-amber-500 fill-amber-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discovery Points</span>
        </div>
        <p className="text-4xl font-black text-slate-900 tabular-nums">{totalPoints}</p>
        <p className="text-xs font-semibold text-slate-400 mt-1">{hopsCount} wonder{hopsCount !== 1 ? 's' : ''} connected</p>

        {questTarget && (
          <div className="mt-3.5 p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Trail Goal</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">🎯 {questTarget}</p>
          </div>
        )}
      </div>

      {/* Last verdict feedback banner */}
      <AnimatePresence mode="wait">
        {lastVerdict && (
          <motion.div
            key={`${lastVerdict}-${hopsCount}-${lastPoints}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-3xl border-2 p-4 text-sm shadow-sm ${VERDICT_STYLE[lastVerdict]}`}
          >
            <div className="flex items-center gap-2 mb-1.5 font-black">
              <span className="text-base">{VERDICT_EMOJI[lastVerdict]}</span>
              <span className="capitalize text-xs tracking-tight">{lastVerdict}</span>
              {lastPoints !== undefined && lastPoints > 0 && (
                <span className="ml-auto text-[11px] font-black bg-white px-2 py-0.5 rounded-full border border-black/5 shadow-xs">
                  +{lastPoints} pts
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {lastReason || (lastVerdict === 'rejected' ? 'This connection was not accepted. Try another idea!' : 'Great discovery! Wonder unlocked on canvas.')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-orange-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Award size={16} className="text-orange-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Badges Unlocked</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {badges.map(b => (
              <motion.span
                key={b}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs"
              >
                🏅 {b}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Points guide */}
      <div className="bg-white rounded-3xl border-2 border-orange-100 p-4 text-xs font-semibold text-slate-500 space-y-2 shadow-xs">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Scoring Guide</p>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">⚡ Established Link</span>
          <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-full">+50</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">🔮 Creative Link</span>
          <span className="text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded-full">+30</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">🌀 Resonance Bonus</span>
          <span className="text-orange-600 font-black bg-orange-50 px-2 py-0.5 rounded-full">+15</span>
        </div>
      </div>
    </div>
  )
}
