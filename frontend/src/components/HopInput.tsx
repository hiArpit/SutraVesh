import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Send, Loader2, X, Sparkles } from 'lucide-react'
import LiveCameraModal from './LiveCameraModal'
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
  onTextHop, onImageHop, loading, disabled, currentNode, targetNode, mode: _mode,
}: Props) {
  const [concept, setConcept] = useState('')
  const [explanation, setExplanation] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const handleCapturedPhoto = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async () => {
    if (loading || disabled) return
    if (imageFile) {
      await onImageHop(explanation.trim() || `Discovered object in environment`, imageFile)
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

  const canSubmit = imageFile ? true : (concept.trim() && explanation.trim())

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      {/* Context banner */}
      <div className="flex items-center gap-2 mb-2 px-4 py-1.5 bg-white/95 backdrop-blur-md rounded-full border-2 border-orange-100 text-xs font-bold text-slate-700 shadow-sm">
        <span>📍 Current: <b className="text-orange-600 capitalize">{currentNode}</b></span>
        {targetNode && (
          <>
            <span className="text-slate-400">→</span>
            <span>🎯 Goal: <b className="text-emerald-600 capitalize">{targetNode}</b></span>
          </>
        )}
      </div>

      {/* Quick Clue Chips */}
      {!imageFile && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-2">
          {CLUE_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => setExplanation(prev => (prev ? `${prev} · ${chip}` : chip))}
              className="text-[11px] font-bold bg-white hover:bg-orange-50 border border-orange-200 text-slate-700 hover:text-orange-600 px-3 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Image preview banner */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 bg-white border-2 border-orange-200 rounded-2xl p-2.5 mb-2 shadow-lg"
          >
            <img
              src={imagePreview}
              alt="preview"
              className="h-14 w-14 rounded-xl object-cover border-2 border-orange-300 shadow-sm"
            />
            <div className="text-xs text-left">
              <p className="font-black text-slate-900">Photo Ready for AI Discovery!</p>
              <p className="text-[11px] text-slate-500 font-medium">Click &quot;DISCOVER NOW&quot; below or add an optional note</p>
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="ml-auto bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 cursor-pointer transition-colors shadow-xs"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main interactive bar (Warm Theme) */}
      <div className="w-full bg-white rounded-3xl border-2 border-orange-200 focus-within:border-orange-500 shadow-xl p-2.5 flex items-center gap-2.5 transition-all">
        {/* Camera Live Viewfinder Trigger */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          disabled={disabled}
          className="px-3.5 py-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-black text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 border border-orange-200 shadow-2xs"
          title="Open live camera lens"
        >
          <Camera size={18} />
          <span className="hidden sm:inline">Camera</span>
        </button>

        {!imageFile ? (
          <>
            <input
              type="text"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Hop to (e.g. Sunlight)..."
              className="w-44 bg-[#FAF6EE] text-slate-900 placeholder-slate-400 text-xs font-bold px-3 py-2.5 rounded-2xl border border-orange-100 focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Why does it connect? (e.g. Reflects light)"
              className="flex-1 bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 px-2 outline-none"
            />
          </>
        ) : (
          <input
            type="text"
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Optional note about this photo (or just click Discover!)..."
            className="flex-1 bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 px-2 outline-none"
          />
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading || disabled}
          className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-xs rounded-2xl shadow-md border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : imageFile ? (
            <>
              <Sparkles size={14} className="text-yellow-200" />
              <span>DISCOVER NOW!</span>
            </>
          ) : (
            <>
              <span>HOP!</span>
              <Send size={13} />
            </>
          )}
        </button>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturedPhoto}
      />
    </motion.div>
  )
}
