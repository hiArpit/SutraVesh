import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Send, Loader2, X } from 'lucide-react'
import type { PlayMode } from '../types/game'

interface Props {
  onTextHop: (concept: string, explanation: string) => Promise<void>
  onImageHop: (explanation: string, file: File) => Promise<void>
  loading: boolean
  disabled: boolean
  currentNode: string
  targetNode?: string
  mode: PlayMode
}

const CLUE_CHIPS = [
  '⚡ Energy & Power',
  '🌱 Nature & Biology',
  '🔬 Tools & Technology',
  '🌊 Water & Cycles',
  '☀️ Sunlight & Heat',
]

export default function HopInput({
  onTextHop, onImageHop, loading, disabled, currentNode, targetNode, mode,
}: Props) {
  const [concept, setConcept] = useState('')
  const [explanation, setExplanation] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (loading || disabled) return
    if (imageFile) {
      if (!explanation.trim()) return
      await onImageHop(explanation.trim(), imageFile)
    } else {
      if (!concept.trim() || !explanation.trim()) return
      await onTextHop(concept.trim(), explanation.trim())
    }
    setConcept('')
    setExplanation('')
    clearImage()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      {/* Context banner */}
      <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-slate-900/90 rounded-full border border-slate-700 text-xs text-slate-300 shadow-md">
        <span>📍 Current: <b className="text-violet-400 capitalize">{currentNode}</b></span>
        {mode === 'quest' && targetNode && (
          <>
            <span className="text-slate-500">→</span>
            <span>🎯 Target: <b className="text-emerald-400 capitalize">{targetNode}</b></span>
          </>
        )}
      </div>

      {/* Quick Clue Chips */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-2">
        {CLUE_CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => setExplanation(prev => (prev ? `${prev} · ${chip}` : chip))}
            className="text-[11px] bg-slate-800/80 hover:bg-violet-900/60 border border-slate-700 hover:border-violet-500 text-slate-300 px-2.5 py-0.5 rounded-full transition-all cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative inline-block mb-2"
          >
            <img
              src={imagePreview}
              alt="preview"
              className="h-16 w-16 rounded-xl object-cover border-2 border-violet-500 shadow-lg"
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main interactive bar */}
      <div className="w-full bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-slate-700 focus-within:border-violet-500 shadow-2xl p-2.5 flex items-center gap-2 transition-all">
        {/* Camera Snap Button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-violet-600 transition-colors text-violet-300 hover:text-white cursor-pointer disabled:opacity-40"
          title="Snap / Upload an object photo"
        >
          <Camera size={19} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImage}
        />

        {!imageFile && (
          <input
            type="text"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Hop to (e.g. Sunlight)..."
            className="w-44 bg-slate-800 text-white placeholder-slate-400 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-400"
          />
        )}

        <input
          type="text"
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          onKeyDown={handleKey}
          placeholder={imageFile ? "Explain how photo connects to " + currentNode : "Why does it connect? (e.g. Reflects light)"}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 px-2 outline-none"
        />

        {/* Send Action */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(imageFile ? !explanation.trim() : (!concept.trim() || !explanation.trim())) || loading || disabled}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span>HOP!</span>
              <Send size={13} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
