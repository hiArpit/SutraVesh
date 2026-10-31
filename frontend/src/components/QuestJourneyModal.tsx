import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Star, ArrowRight, Loader2, Lock, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
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
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      const savedMax = Number(localStorage.getItem('sutravesh_max_level') || '1')
      setMaxUnlockedLevel(savedMax)

      // Auto-select tier containing current active unlocked level
      const currentTier = Math.min(5, Math.max(1, Math.ceil(savedMax / 3)))
      setSelectedTier(currentTier)

      listQuestLevelsApi()
        .then(res => setLevels(res.levels))
        .catch(err => console.error('Failed to load quest levels', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const handleResetProgress = () => {
    if (window.confirm('Reset quest progress back to Level 1?')) {
      localStorage.setItem('sutravesh_max_level', '1')
      setMaxUnlockedLevel(1)
      setSelectedTier(1)
    }
  }

  if (!isOpen) return null

  const tierNames = [
    { tier: 1, name: 'Everyday Friends', emoji: '🌸', subtitle: '1-Hop Casual Links' },
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
        <div className="flex items-center justify-between pb-3.5 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl shadow-md font-black">
              🗺️
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-none">Quest Journey Ladder</h3>
              <p className="text-xs font-bold text-orange-600 mt-1">
                Unlocked: Level {maxUnlockedLevel} of 15 · Clear each level to unlock the next!
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

        {/* Tier Selector: Responsive flex-wrap + Quick Next/Prev Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-orange-100/60 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {tierNames.map(t => {
              const tierMinLevel = (t.tier - 1) * 3 + 1
              const isTierLocked = tierMinLevel > maxUnlockedLevel
              return (
                <button
                  key={t.tier}
                  onClick={() => setSelectedTier(t.tier)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTier === t.tier
                      ? 'bg-orange-500 text-white shadow-md'
                      : isTierLocked
                      ? 'bg-white/60 text-slate-400 border border-slate-200'
                      : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-400'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>Tier {t.tier}</span>
                  {isTierLocked ? (
                    <Lock size={11} className="text-slate-400" />
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Quick Prev / Next Tier Arrows */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setSelectedTier(prev => Math.max(1, prev - 1))}
              disabled={selectedTier === 1}
              className="p-1.5 bg-white border border-orange-200 rounded-xl text-slate-600 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Previous Tier"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-600 px-1.5">
              Tier {selectedTier} / 5
            </span>
            <button
              onClick={() => setSelectedTier(prev => Math.min(5, prev + 1))}
              disabled={selectedTier === 5}
              className="p-1.5 bg-white border border-orange-200 rounded-xl text-slate-600 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="Next Tier"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Current Tier Description Banner */}
        <div className="pt-2.5 pb-1 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
          <span className="text-orange-700 font-black">
            {tierNames[selectedTier - 1]?.emoji} {tierNames[selectedTier - 1]?.name}: {tierNames[selectedTier - 1]?.subtitle}
          </span>
          <span className="text-slate-400 text-[11px]">
            Levels {(selectedTier - 1) * 3 + 1} to {selectedTier * 3}
          </span>
        </div>

        {/* Level List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-orange-500">
              <Loader2 size={32} className="animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-500">Loading discovery levels...</p>
            </div>
          ) : (
            filteredLevels.map(lvl => {
              const isUnlocked = lvl.level_number <= maxUnlockedLevel
              const isCleared = lvl.level_number < maxUnlockedLevel

              return (
                <motion.div
                  key={lvl.level_number}
                  whileHover={isUnlocked ? { scale: 1.01 } : {}}
                  className={`rounded-3xl p-5 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 ${
                    isUnlocked
                      ? 'bg-white border-orange-100 hover:border-orange-300'
                      : 'bg-slate-100/70 border-slate-200 opacity-65'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          isUnlocked
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        Level {lvl.level_number}
                      </span>

                      {isCleared ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          <CheckCircle2 size={12} />
                          <span>CLEARED</span>
                        </span>
                      ) : !isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black">
                          <Lock size={11} />
                          <span>LOCKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                          <span>ACTIVE</span>
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-400">
                        {lvl.required_hops} Hop{lvl.required_hops > 1 ? 's' : ''}
                      </span>

                      <div className="flex items-center gap-0.5 ml-auto sm:ml-0 text-amber-400">
                        {[...Array(lvl.stars_reward)].map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            className={isCleared ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                          />
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

                    {!isUnlocked && (
                      <p className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                        <Lock size={12} />
                        <span>Clear Level {lvl.level_number - 1} to unlock this level!</span>
                      </p>
                    )}
                  </div>

                  <button
                    disabled={!isUnlocked}
                    onClick={() => isUnlocked && onSelectLevel(lvl)}
                    className={`w-full sm:w-auto px-5 py-3 text-xs rounded-2xl font-black transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      isUnlocked
                        ? 'bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white shadow-md border-b-4 border-orange-700 active:border-b-0 cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border-b-2 border-slate-300'
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Sparkles size={14} className="text-yellow-200" />
                        <span>{isCleared ? `REPLAY LEVEL ${lvl.level_number}` : `PLAY LEVEL ${lvl.level_number}`}</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>LOCKED</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Footer: Subtle reset for testing */}
        <div className="pt-2 border-t border-orange-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Levels progress automatically as you complete each quest.</span>
          <button
            onClick={handleResetProgress}
            className="hover:text-rose-500 font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw size={11} />
            <span>Reset Progress</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
