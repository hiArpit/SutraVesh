import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Star, ArrowRight, Loader2 } from 'lucide-react'
import type { QuestLevel } from '../types/game'
import { listQuestLevelsApi } from '../api/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectLevel: (level: QuestLevel) => void
}

export default function QuestJourneyModal({ isOpen, onClose, onSelectLevel }: Props) {
  const [levels, setLevels] = useState<QuestLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<number>(1)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      listQuestLevelsApi()
        .then(res => setLevels(res.levels))
        .catch(err => console.error('Failed to load quest levels', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const tierNames = [
    { tier: 1, name: 'Everyday Friends', emoji: '🌸', subtitle: '1-Hop Casual Discoveries' },
    { tier: 2, name: 'Everyday Bridges', emoji: '🧀', subtitle: 'Where Things Come From' },
    { tier: 3, name: 'Living Cycles', emoji: '🦋', subtitle: 'Growth & Transformations' },
    { tier: 4, name: 'Tools & Inventions', emoji: '💡', subtitle: 'Harnessing Nature' },
    { tier: 5, name: 'Cosmic Science', emoji: '🔭', subtitle: 'From Sand to Stars' },
  ]

  const filteredLevels = levels.filter(lvl => lvl.tier === selectedTier)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#FAF6EE] border-2 border-orange-200 rounded-3xl p-6 sm:p-7 max-w-3xl w-full shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl shadow-md font-black">
              🗺️
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-none">Quest Journey Ladder</h3>
              <p className="text-xs font-bold text-orange-600 mt-1">
                15 Progressive Levels · Pick a level to begin your trail!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-white/80 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tier Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-3.5 scrollbar-none shrink-0">
          {tierNames.map(t => (
            <button
              key={t.tier}
              onClick={() => setSelectedTier(t.tier)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                selectedTier === t.tier
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-orange-100 hover:border-orange-300'
              }`}
            >
              <span>{t.emoji}</span>
              <span>Tier {t.tier}: {t.name}</span>
            </button>
          ))}
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-orange-500">
              <Loader2 size={32} className="animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading discovery levels...</p>
            </div>
          ) : (
            filteredLevels.map(lvl => (
              <motion.div
                key={lvl.level_number}
                whileHover={{ scale: 1.01 }}
                className="bg-white border-2 border-orange-100 hover:border-orange-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-black uppercase tracking-wider">
                      Level {lvl.level_number}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {lvl.required_hops} Hop{lvl.required_hops > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-0.5 ml-auto sm:ml-0 text-amber-400">
                      {[...Array(lvl.stars_reward)].map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <h4 className="text-base font-black text-slate-900 leading-tight mb-1">
                    {lvl.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mb-3">
                    {lvl.description}
                  </p>

                  {/* Seed to Goal Trail representation */}
                  <div className="inline-flex items-center gap-2 bg-[#FAF6EE] px-3 py-1.5 rounded-2xl border border-orange-100 text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <span>{lvl.emoji}</span>
                      <span>{lvl.starting_seed}</span>
                    </span>
                    <ArrowRight size={13} className="text-orange-500" />
                    <span className="flex items-center gap-1 text-orange-700">
                      <span>{lvl.target_emoji || '🌟'}</span>
                      <span>{lvl.target_wonder || 'Any Discovery'}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectLevel(lvl)}
                  className="w-full sm:w-auto px-5 py-3 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-xs rounded-2xl shadow-md border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles size={14} className="text-yellow-200" />
                  <span>PLAY LEVEL {lvl.level_number}</span>
                </button>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
