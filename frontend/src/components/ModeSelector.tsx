import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X } from 'lucide-react'
import type { PlayMode } from '../types/game'

interface Props {
  onStart: (mode: PlayMode, seed: string, target?: string) => void
}

const STARTER_TRAILS = [
  { seed: 'Leaf', target: 'Solar Panel', title: 'Sunlight & Clean Energy', emoji: '🌿' },
  { seed: 'Water Bottle', target: 'Rain Cloud', title: 'The Water Cycle', emoji: '💧' },
  { seed: 'Sun', target: 'Electric Car', title: 'Power of the Stars', emoji: '☀️' },
  { seed: 'Volcano', target: 'Geothermal Energy', title: 'Earth & Heat', emoji: '🌋' },
]

export default function ModeSelector({ onStart }: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [seedInput, setSeedInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [hasTarget, setHasTarget] = useState(false)
  const [error, setError] = useState('')

  const handleOpenStart = (initialSeed = 'Leaf', initialTarget = '') => {
    setSeedInput(initialSeed)
    setTargetInput(initialTarget)
    setHasTarget(!!initialTarget)
    setError('')
    setIsOpenModal(true)
  }

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!seedInput.trim()) {
      setError('Please choose a starting wonder to explore!')
      return
    }

    const mode: PlayMode = hasTarget && targetInput.trim() ? 'quest' : 'world'
    onStart(mode, seedInput.trim(), hasTarget && targetInput.trim() ? targetInput.trim() : undefined)
    setIsOpenModal(false)
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
            <span>AI-Powered Kid Discovery Adventure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-3">
            What will we discover today?
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6 font-medium">
            Take a picture or choose a wonder. We&apos;ll turn curiosity into an educational learning trail!
          </p>
          <button
            onClick={() => handleOpenStart('Leaf', 'Solar Panel')}
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Explore the world</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* Two Main Cards: Lens vs Custom Wonder */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Card 1: Look Through Your Lens */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => handleOpenStart('Leaf', 'Solar Panel')}
          className="bg-white border-2 border-orange-100 hover:border-orange-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                BEST WAY TO BEGIN
              </span>
              <span className="text-2xl">📸</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              Look through your lens
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Point at one interesting thing or photo and let&apos;s map its connections to science and nature.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-orange-600">
            <span>Start Learning Trail</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>

        {/* Card 2: Discovery Map */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          onClick={() => handleOpenStart('', '')}
          className="bg-white border-2 border-orange-100 hover:border-orange-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full">
                YOUR LEARNING TRAIL
              </span>
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              Choose a Wonder
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pick any topic you are curious about to build a guided step-by-step discovery trail.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
            <span>Pick a Topic</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>
      </div>

      {/* Popular Starter Trails */}
      <div className="w-full max-w-4xl">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          Popular Trails to Explore:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {STARTER_TRAILS.map(t => (
            <button
              key={t.title}
              type="button"
              onClick={() => handleOpenStart(t.seed, t.target)}
              className="p-4 bg-white hover:bg-orange-50/60 border-2 border-orange-100 hover:border-orange-300 rounded-2xl text-left transition-all cursor-pointer shadow-sm group"
            >
              <span className="text-2xl block mb-2">{t.emoji}</span>
              <p className="text-xs font-black text-slate-900 group-hover:text-orange-600 truncate">
                {t.seed} → {t.target}
              </p>
              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{t.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* START TRAIL MODAL (Warm Theme) */}
      <AnimatePresence>
        {isOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
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
                    Start Your Learning Trail
                  </h3>
                  <p className="text-xs text-slate-500">Pick what you want to explore first</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleStartGame} className="flex flex-col gap-4">
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
