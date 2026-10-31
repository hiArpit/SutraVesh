import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X, Compass } from 'lucide-react'
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

    // Unified mode: 'quest' if goal set, 'world' if free exploration
    const mode: PlayMode = hasTarget && targetInput.trim() ? 'quest' : 'world'
    onStart(mode, seedInput.trim(), hasTarget && targetInput.trim() ? targetInput.trim() : undefined)
    setIsOpenModal(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 max-w-xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 text-xs font-semibold mb-3 shadow-sm">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Small questions. Big discoveries.</span>
        </div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent mb-3">
          SutraVesh
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
          What will we discover today? Take a picture or choose a wonder. We&apos;ll turn curiosity into an educational learning adventure.
        </p>
      </motion.div>

      {/* Main Single Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl mb-8">
        {/* Card 1: Start Discovery Trail */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenStart('Leaf', 'Solar Panel')}
          className="bg-gradient-to-br from-violet-900/70 to-indigo-950/80 border-2 border-violet-500/60 hover:border-violet-400 rounded-3xl p-6 text-left cursor-pointer transition-all shadow-xl hover:shadow-violet-500/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-violet-600/30 flex items-center justify-center text-2xl mb-4 border border-violet-400/40">
              🧭
            </div>
            <h2 className="text-xl font-black text-white mb-1">Start a Learning Trail</h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Pick a wonder and see how everything connects through nature, science, and technology.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-300 bg-violet-950/60 border border-violet-500/40 px-3.5 py-2 rounded-xl w-fit">
            <span>Explore Now</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>

        {/* Card 2: Custom Free Exploration */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenStart('', '')}
          className="bg-gradient-to-br from-slate-900/90 to-cyan-950/80 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-3xl p-6 text-left cursor-pointer transition-all shadow-xl hover:shadow-cyan-500/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 flex items-center justify-center text-2xl mb-4 border border-cyan-400/40">
              ✨
            </div>
            <h2 className="text-xl font-black text-white mb-1">Explore Any Wonder</h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Have an idea in mind? Type anything you are curious about to map its connections.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-3.5 py-2 rounded-xl w-fit">
            <span>Choose Wonder</span>
            <ArrowRight size={14} />
          </div>
        </motion.div>
      </div>

      {/* Popular Starter Trails Carousel */}
      <div className="w-full max-w-2xl">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center md:text-left">
          🌟 Popular Trails to Discover:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STARTER_TRAILS.map(t => (
            <button
              key={t.title}
              type="button"
              onClick={() => handleOpenStart(t.seed, t.target)}
              className="p-3 bg-slate-900/90 hover:bg-violet-950/60 border border-slate-800 hover:border-violet-500 rounded-2xl text-left transition-all cursor-pointer shadow-md group"
            >
              <span className="text-xl block mb-1">{t.emoji}</span>
              <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                {t.seed} → {t.target}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{t.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* START MODAL */}
      <AnimatePresence>
        {isOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border-2 border-violet-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl">
                  <Compass size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Begin Discovery Trail</h3>
                  <p className="text-xs text-slate-400">Where should your journey start?</p>
                </div>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleStartGame} className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Starting Wonder
                  </label>
                  <input
                    type="text"
                    required
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder="e.g. Leaf, Sun, Volcano, Water..."
                    className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-400 font-semibold"
                  />
                </div>

                {/* Optional Quest Destination Toggle */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Add a Destination Goal? (Optional)
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasTarget(!hasTarget)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                        hasTarget
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {hasTarget ? 'Enabled 🎯' : 'Free Explore'}
                    </button>
                  </div>

                  {hasTarget && (
                    <input
                      type="text"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. Solar Panel, Electricity, Cloud..."
                      className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 font-semibold mt-1"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-3 w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Begin Trail! 🚀</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <p className="mt-10 text-xs text-slate-600">
        SutraVesh · Powered by Groq LPU & Wikipedia REST Grounding
      </p>
    </div>
  )
}
