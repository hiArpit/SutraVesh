import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Send, Loader2, X, Sparkles, Upload } from 'lucide-react'
import LiveCameraModal from './LiveCameraModal'
import type { PlayMode } from '../types/game'

interface Props {
  onTextHop: (concept: string, explanation?: string) => Promise<void>
  onImageHop: (explanation: string, file: File) => Promise<void>
  loading: boolean
  disabled: boolean
  currentNode: string
  targetNode?: string
  mode: PlayMode
}

export default function HopInput({
  onTextHop, onImageHop, loading, disabled, currentNode, targetNode, mode: _mode,
}: Props) {
  const [concept, setConcept] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const openCamera = () => {
    window.history.pushState({ modal: 'camera' }, '', '#camera')
    setIsCameraOpen(true)
  }
  const closeCamera = () => {
    if (window.location.hash === '#camera') {
      window.history.back()
    }
    setIsCameraOpen(false)
  }

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash !== '#camera') {
        setIsCameraOpen(false)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleCapturedPhoto = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (loading || disabled) return
    if (imageFile) {
      await onImageHop('Discovered object through camera lens', imageFile)
      clearImage()
    } else {
      if (!concept.trim()) return
      const textConcept = concept.trim()
      setConcept('')
      await onTextHop(textConcept)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = imageFile ? true : concept.trim().length > 0

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-xl mx-auto flex flex-col items-center"
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

      {/* Image preview banner if a photo is captured or uploaded */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 bg-white border-2 border-orange-200 rounded-2xl p-2.5 mb-2 shadow-lg w-full"
          >
            <img
              src={imagePreview}
              alt="preview"
              className="h-12 w-12 rounded-xl object-cover border-2 border-orange-300 shadow-sm"
            />
            <div className="text-xs text-left">
              <p className="font-black text-slate-900">Photo Ready for AI Discovery!</p>
              <p className="text-[11px] text-slate-500 font-medium">Click &quot;DISCOVER NOW&quot; to identify and connect</p>
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="ml-auto bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 cursor-pointer transition-colors shadow-xs"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main interactive bar */}
      <div className="w-full bg-white rounded-3xl border-2 border-orange-200 focus-within:border-orange-500 shadow-xl p-2 flex items-center gap-2 transition-all">
        {/* Camera Live Viewfinder Trigger */}
        <button
          type="button"
          onClick={openCamera}
          disabled={disabled || loading}
          className="px-3.5 py-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-black text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 border border-orange-200 shadow-2xs shrink-0"
          title="Open live camera lens"
        >
          <Camera size={17} />
          <span className="hidden sm:inline">Camera</span>
        </button>

        {/* Upload file trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
          className="px-3 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 border border-slate-200 shadow-2xs shrink-0"
          title="Choose photo from device"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Choose</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Single concept name input (No "Why does it connect" text) */}
        {!imageFile ? (
          <input
            type="text"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type object name to discover (e.g. Paper, Sun, Bee)..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-slate-800 placeholder-slate-400 px-3 py-2 outline-none"
            autoFocus
          />
        ) : (
          <div className="flex-1 px-3 text-xs font-bold text-orange-600">
            Image selected · Ready to analyze!
          </div>
        )}

        {/* Submit Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading || disabled}
          className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-xs rounded-2xl shadow-md border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : imageFile ? (
            <>
              <Sparkles size={14} className="text-yellow-200" />
              <span>DISCOVER!</span>
            </>
          ) : (
            <>
              <span>DISCOVER</span>
              <Send size={13} />
            </>
          )}
        </button>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={closeCamera}
        onCapture={handleCapturedPhoto}
      />
    </motion.div>
  )
}
