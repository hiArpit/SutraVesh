import { motion } from 'framer-motion'
import type { PlayMode } from '../types/game'

interface Props {
  onStart: (mode: PlayMode, seed: string, target?: string) => void
}

export default function ModeSelector({ onStart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-black bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400
          bg-clip-text text-transparent mb-3">
          WonderLens
        </h1>
        <p className="text-slate-400 text-lg">by SutraVesh · Discover. Connect. Wonder.</p>
      </motion.div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <ModeCard
          emoji="🏹"
          title="Chain Hunt"
          subtitle="Quest Mode"
          description="Connect concepts step-by-step from a starting idea to a hidden target. Shortest path wins!"
          gradient="from-violet-600 to-purple-800"
          border="border-violet-500"
          onClick={() => {
            const seed = prompt('Starting concept (e.g. "sun"):')?.trim()
            const target = prompt('Target concept (e.g. "photosynthesis"):')?.trim()
            if (seed && target) onStart('quest', seed, target)
          }}
        />
        <ModeCard
          emoji="🌍"
          title="Divergent Islands"
          subtitle="World Mode"
          description="Free exploration! Connect ideas in any direction. Create resonance bridges and discover hidden islands!"
          gradient="from-cyan-600 to-teal-800"
          border="border-cyan-500"
          onClick={() => {
            const seed = prompt('What do you want to explore? (e.g. "volcano"):')?.trim()
            if (seed) onStart('world', seed)
          }}
        />
      </div>

      <p className="mt-8 text-xs text-slate-600">
        Powered by Groq LPU · Wikipedia · @xyflow/react
      </p>
    </div>
  )
}

function ModeCard({
  emoji, title, subtitle, description, gradient, border, onClick
}: {
  emoji: string; title: string; subtitle: string; description: string
  gradient: string; border: string; onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} ${border} border-2 rounded-3xl
        p-6 text-left cursor-pointer transition-shadow hover:shadow-xl hover:shadow-violet-500/20`}
    >
      <span className="text-4xl mb-3 block">{emoji}</span>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">{subtitle}</p>
      <p className="text-sm text-white/80 leading-relaxed">{description}</p>
      <div className="mt-4 inline-block bg-white/20 text-white text-xs font-bold
        px-4 py-2 rounded-full">
        Start →
      </div>
    </motion.button>
  )
}
