import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X, Compass } from 'lucide-react'
import type { PlayMode, QuestLevel } from '../types/game'
import QuestJourneyModal from './QuestJourneyModal'

interface Props {
  onStart: (mode: PlayMode, seed: string, target?: string, levelNumber?: number) => void
}

export default function ModeSelector({ onStart }: Props) {
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false)
  const [isOpenCustomModal, setIsOpenCustomModal] = useState(false)
  const [seedInput, setSeedInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [hasTarget, setHasTarget] = useState(false)
  const [error, setError] = useState('')

  const handleSelectLevel = (level: QuestLevel) => {
    setIsJourneyModalOpen(false)
    const mode: PlayMode = level.target_wonder ? 'quest' : 'world'
    onStart(mode, level.starting_seed, level.target_wonder || undefined, level.level_number)
  }

  const handleStartCustomGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!seedInput.trim()) {
      setError('Please choose a starting wonder to explore!')
      return
    }

    const mode: PlayMode = hasTarget && targetInput.trim() ? 'quest' : 'world'
    onStart(mode, seedInput.trim(), hasTarget && targetInput.trim() ? targetInput.trim() : undefined)
    setIsOpenCustomModal(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-slate-800 flex flex-col items-center justify-start py-8 px-4 sm:px-6 relative">
      {/* Top Brand Pill Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md">
            🔍
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              SutraVesh
            </h1>
            <p className="text-[11px] font-semibold text-orange-600 mt-0.5">
              Small questions. Big discoveries.
            </p>
          </div>
        </div>
      </div>

      {/* Deep Ocean Blue Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-gradient-to-r from-[#17385E] via-[#1E4574] to-[#17385E] text-white rounded-3xl p-8 sm:p-10 mb-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-bold text-orange-300 mb-4 border border-white/10">
            <Sparkles size={13} className="text-yellow-300" />
            <span>15 Progressive Discovery Levels</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-3">
            What will we discover today?
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6 font-medium">
            Step through 15 progressive levels or snap photos of real-world objects to build your interactive discovery map!
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsJourneyModalOpen(true)}
              className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Play Quest Ladder (Levels 1–15)</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onStart('world', 'Flower')}
              className="px-5 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-2xl backdrop-blur-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📷 Free Photo Discovery</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Two Main Cards: Quest Ladder vs Free Exploration */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Card 1: 15-Level Quest Ladder */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => setIsJourneyModalOpen(true)}
          className="bg-white border-2 border-orange-100 hover:border-orange-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                RECOMMENDED · 15 LEVELS
              </span>
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              Quest Journey Ladder
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Start with simple 1-hop discoveries like 🌸 Flower ➔ 🐝 Bee, and progress level-by-level to cosmic science!
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-orange-600">
            <span>Open Level Map</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>

        {/* Card 2: Free Exploration & Lens Mode */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => onStart('world', 'Flower')}
          className="bg-white border-2 border-orange-100 hover:border-orange-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full">
                CAMERA & SNAP MODE
              </span>
              <span className="text-2xl">📸</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              Free Photo Discovery
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Take a live camera snap or upload any photo from your room or web. AI auto-captions it and connects it to your map!
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
            <span>Explore Freely</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>
      </div>

      {/* Custom Topic Trigger */}
      <div className="w-full max-w-4xl text-center">
        <button
          onClick={() => {
            setSeedInput('')
            setTargetInput('')
            setHasTarget(false)
            setError('')
            setIsOpenCustomModal(true)
          }}
          className="text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <Compass size={14} />
          <span>Or create your own custom seed wonder & destination...</span>
        </button>
      </div>

      {/* 15-LEVEL QUEST JOURNEY MODAL */}
      <QuestJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
        onSelectLevel={handleSelectLevel}
      />

      {/* CUSTOM WONDER MODAL */}
      <AnimatePresence>
        {isOpenCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsOpenCustomModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-full cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl shadow-inner">
                  🌱
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    Custom Discovery Topic
                  </h3>
                  <p className="text-xs text-slate-500">Pick any custom concept you wish to explore</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleStartCustomGame} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Starting Wonder
                  </label>
                  <input
                    type="text"
                    required
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder="e.g. Leaf, Sun, Volcano, Water..."
                    className="w-full bg-[#FAF6EE] text-slate-900 text-xs px-3.5 py-3 rounded-2xl border-2 border-orange-100 focus:outline-none focus:border-orange-500 font-bold"
                  />
                </div>

                <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      Add a Destination Goal? (Optional)
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasTarget(!hasTarget)}
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                        hasTarget
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {hasTarget ? 'Goal On 🎯' : 'Free Explore'}
                    </button>
                  </div>

                  {hasTarget && (
                    <input
                      type="text"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. Solar Panel, Plant, Electricity..."
                      className="w-full bg-white text-slate-900 text-xs px-3 py-2.5 rounded-xl border-2 border-orange-200 focus:outline-none focus:border-orange-500 font-bold mt-1"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Begin Adventure! 🚀</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
