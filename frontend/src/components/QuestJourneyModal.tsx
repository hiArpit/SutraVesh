import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Star, ArrowRight, Loader2, Lock, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import type { QuestLevel, UserProfile } from '../types/game'
import { listQuestLevelsApi, updateUserProgressApi } from '../api/client'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectLevel: (level: QuestLevel) => void
  currentUser?: UserProfile | null
}

export default function QuestJourneyModal({ isOpen, onClose, onSelectLevel, currentUser }: Props) {
  const [levels, setLevels] = useState<QuestLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<number>(1)
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(1)

  const storageKey = currentUser
    ? `sutravesh_user_${currentUser.username}_max_level`
    : 'sutravesh_guest_max_level'

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      const userBackendMax = currentUser?.max_level ?? 1
      const savedMax = Number(localStorage.getItem(storageKey) || String(userBackendMax))
      const finalMax = Math.max(userBackendMax, savedMax, 1)
      setMaxUnlockedLevel(finalMax)
      localStorage.setItem(storageKey, String(finalMax))

      // Auto-select tier containing current active unlocked level
      const currentTier = Math.min(5, Math.max(1, Math.ceil(finalMax / 3)))
      setSelectedTier(currentTier)

      listQuestLevelsApi()
        .then(res => setLevels(res.levels))
        .catch(err => console.error('Failed to load quest levels', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen, currentUser?.username, storageKey])

  const handleResetProgress = () => {
    if (window.confirm('Reset quest progress back to Level 1?')) {
      localStorage.setItem(storageKey, '1')
      if (currentUser) {
        updateUserProgressApi({ max_level: 1 })
      }
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
                  {isTierLocked && <Lock size={12} className="text-slate-400 ml-0.5" />}
                </button>
              )
            })}
          </div>

          {/* Quick prev / next tier arrows */}
          <div className="flex items-center gap-1 bg-white border border-orange-200 rounded-2xl px-2 py-1 shadow-xs">
            <button
              onClick={() => setSelectedTier(prev => Math.max(1, prev - 1))}
              disabled={selectedTier <= 1}
              className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Tier"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-black text-slate-700 px-1">
              Tier {selectedTier} / 5
            </span>
            <button
              onClick={() => setSelectedTier(prev => Math.min(5, prev + 1))}
              disabled={selectedTier >= 5}
              className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Next Tier"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Selected Tier Subtitle */}
        <div className="pt-3 pb-2 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-orange-700">
            <span>{tierNames[selectedTier - 1]?.emoji}</span>
            <span>{tierNames[selectedTier - 1]?.name}: {tierNames[selectedTier - 1]?.subtitle}</span>
          </div>
          <span>Levels {(selectedTier - 1) * 3 + 1} to {selectedTier * 3}</span>
        </div>

        {/* Level Cards List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          ) : (
            filteredLevels.map((lvl) => {
              const isCleared = lvl.level_number < maxUnlockedLevel
              const isActive = lvl.level_number === maxUnlockedLevel
              const isLocked = lvl.level_number > maxUnlockedLevel

              return (
                <div
                  key={lvl.level_number}
                  className={`border-2 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-amber-50/70 border-orange-400 shadow-sm'
                      : isCleared
                      ? 'bg-white border-emerald-200'
                      : 'bg-slate-50/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        LEVEL {lvl.level_number}
                      </span>
                      {isCleared && (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 size={12} /> CLEARED
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[11px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded-md">
                          ACTIVE
                        </span>
                      )}
                      {isLocked && (
                        <span className="text-[11px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock size={12} /> LOCKED
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-slate-500">
                        {lvl.required_hops} Hop{lvl.required_hops > 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center text-amber-400 ml-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={isCleared ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                          />
                        ))}
                      </div>
                    </div>

                    <h4 className="text-base font-black text-slate-900 tracking-tight">
                      {lvl.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {lvl.description}
                    </p>

                    <div className="pt-1 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className="bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                        <span>{lvl.emoji}</span>
                        <span>{lvl.starting_seed}</span>
                      </span>
                      <ArrowRight size={13} className="text-orange-500" />
                      <span className="bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                        <span>{lvl.target_emoji || '🌟'}</span>
                        <span>{lvl.target_wonder || 'Any Discovery'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full sm:w-auto shrink-0">
                    {isLocked ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 text-slate-400 rounded-2xl text-xs font-black cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Lock size={14} />
                        <span>LOCKED</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectLevel(lvl)
                          onClose()
                        }}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-95'
                            : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-95'
                        }`}
                      >
                        <Sparkles size={14} />
                        <span>{isActive ? `PLAY LEVEL ${lvl.level_number}` : `REPLAY LEVEL ${lvl.level_number}`}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info & Reset button */}
        <div className="pt-3 border-t border-orange-100 flex items-center justify-between text-[11px] font-bold text-slate-400 shrink-0">
          <span>Levels progress automatically as you complete each quest.</span>
          <button
            onClick={handleResetProgress}
            className="flex items-center gap-1 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
            title="Reset to Level 1"
          >
            <RotateCcw size={12} />
            <span>Reset Progress</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
