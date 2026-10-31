import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X, Compass, Target } from 'lucide-react'
import type { PlayMode } from '../types/game'

interface Props {
  onStart: (mode: PlayMode, seed: string, target?: string) => void
}

const QUEST_PRESETS = [
  { seed: 'Leaf', target: 'Solar Panel', desc: 'Photosynthesis & Solar Energy' },
  { seed: 'Sun', target: 'Plant', desc: 'Light & Life' },
  { seed: 'Water Bottle', target: 'Cloud', desc: 'The Water Cycle' },
]

const WORLD_PRESETS = ['Volcano', 'Black Hole', 'Robot', 'Photosynthesis', 'Ocean']

export default function ModeSelector({ onStart }: Props) {
  const [selectedMode, setSelectedMode] = useState<PlayMode | null>(null)
  const [seedInput, setSeedInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [error, setError] = useState('')

  const handleOpenModal = (mode: PlayMode) => {
    setSelectedMode(mode)
    setError('')
    if (mode === 'quest') {
      setSeedInput('Leaf')
      setTargetInput('Solar Panel')
    } else {
      setSeedInput('Volcano')
      setTargetInput('')
    }
  }

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!seedInput.trim()) {
      setError('Please choose a starting wonder to explore!')
      return
    }
    if (selectedMode === 'quest' && !targetInput.trim()) {
      setError('Please choose a target wonder for your quest!')
      return
    }

    onStart(
      selectedMode!,
      seedInput.trim(),
      selectedMode === 'quest' ? targetInput.trim() : undefined
    )
    setSelectedMode(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/40 text-violet-300 text-xs font-semibold mb-4 shadow-sm">
          <Sparkles size={14} className="text-yellow-400" />
          <span>Next-Gen Agentic Learning</span>
        </div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent mb-3">
          SutraVesh
        </h1>
        <p className="text-slate-400 text-base max-w-md mx-auto">
          Discover how the wonders of nature, science, and inventions connect together.
        </p>
      </motion.div>

      {/* Mode selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenModal('quest')}
          className="bg-gradient-to-br from-violet-900/60 to-purple-950/80 border-2 border-violet-500/60 hover:border-violet-400 rounded-3xl p-6 text-left cursor-pointer transition-all shadow-xl hover:shadow-violet-500/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-violet-600/30 flex items-center justify-center text-2xl mb-4 border border-violet-400/40">
              🏹
            </div>
            <h2 className="text-xl font-black text-white mb-1">Chain Hunt</h2>
            <p className="text-[11px] font-bold text-violet-300 uppercase tracking-wider mb-2">
              Quest Challenge
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Start with an object and build a stepping-stone bridge toward a goal in as few hops as possible.
            </p>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-violet-300">
            <span>Begin Quest</span>
            <ArrowRight size={14} />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenModal('world')}
          className="bg-gradient-to-br from-cyan-950/60 to-teal-950/80 border-2 border-cyan-500/60 hover:border-cyan-400 rounded-3xl p-6 text-left cursor-pointer transition-all shadow-xl hover:shadow-cyan-500/20 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 flex items-center justify-center text-2xl mb-4 border border-cyan-400/40">
              🌍
            </div>
            <h2 className="text-xl font-black text-white mb-1">Divergent Islands</h2>
            <p className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-2">
              Free Sandbox
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explore in any direction. Discover multi-node resonance links and build expanding concept clusters.
            </p>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <span>Enter Sandbox</span>
            <ArrowRight size={14} />
          </div>
        </motion.button>
      </div>

      {/* IN-APP SETUP MODAL (Replaces raw window.prompt) */}
      <AnimatePresence>
        {selectedMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border-2 border-violet-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl">
                  {selectedMode === 'quest' ? <Target size={22} /> : <Compass size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {selectedMode === 'quest' ? 'Setup Your Chain Hunt' : 'Choose Your First Wonder'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedMode === 'quest'
                      ? 'Pick your starting point and destination goal'
                      : 'Pick a starting concept to begin exploring'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleStartGame} className="flex flex-col gap-3">
                {/* Starting concept input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Starting Wonder
                  </label>
                  <input
                    type="text"
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder="e.g. Leaf, Sun, Volcano..."
                    className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-400 font-semibold"
                  />
                </div>

                {/* Target concept input (Quest Mode only) */}
                {selectedMode === 'quest' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Target Destination Goal
                    </label>
                    <input
                      type="text"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. Solar Panel, Plant, Electricity..."
                      className="w-full bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400 font-semibold"
                    />
                  </div>
                )}

                {/* Quick suggestions */}
                <div className="mt-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                    Or pick a popular idea:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMode === 'quest'
                      ? QUEST_PRESETS.map(p => (
                          <button
                            key={p.seed}
                            type="button"
                            onClick={() => {
                              setSeedInput(p.seed)
                              setTargetInput(p.target)
                            }}
                            className="text-[11px] bg-slate-800 hover:bg-violet-900/60 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            {p.seed} → {p.target}
                          </button>
                        ))
                      : WORLD_PRESETS.map(w => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setSeedInput(w)}
                            className="text-[11px] bg-slate-800 hover:bg-cyan-900/60 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            {w}
                          </button>
                        ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  type="submit"
                  className="mt-3 w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Start Adventure</span>
                  <ArrowRight size={14} />
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
