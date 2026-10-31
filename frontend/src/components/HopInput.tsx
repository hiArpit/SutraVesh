import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Send, Loader2, X } from 'lucide-react'
import type { PlayMode } from '../types/game'

interface Props {
  onTextHop: (explanation: string) => Promise<void>
  onImageHop: (explanation: string, file: File) => Promise<void>
  loading: boolean
  disabled: boolean
  currentNode: string
  targetNode?: string
  mode: PlayMode
}

export default function HopInput({
  onTextHop, onImageHop, loading, disabled, currentNode, targetNode, mode,
}: Props) {
  const [text, setText] = useState('')
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
    if (!text.trim() || loading || disabled) return
    if (imageFile) {
      await onImageHop(text.trim(), imageFile)
    } else {
      await onTextHop(text.trim())
    }
    setText('')
    clearImage()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Context hint */}
      <p className="text-center text-xs text-slate-400 mb-2">
        {mode === 'quest' && targetNode
          ? `🎯 Connect from "${currentNode}" toward "${targetNode}"`
          : `🌍 Exploring from "${currentNode}" — go anywhere!`}
      </p>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative inline-block mb-2"
          >
            <img src={imagePreview} alt="preview"
              className="h-16 w-16 rounded-lg object-cover border border-violet-500" />
            <button onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex gap-2 items-end bg-slate-800 rounded-2xl border border-slate-600
        focus-within:border-violet-500 transition-colors p-2">

        {/* Camera button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-xl bg-slate-700 hover:bg-violet-700 transition-colors disabled:opacity-40"
          title="Snap a photo"
        >
          <Camera size={18} className="text-violet-300" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleImage} />

        {/* Text input */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled || loading}
          placeholder={imageFile
            ? 'Explain how this image connects...'
            : 'Type how these ideas connect... (Enter to send)'}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm text-white
            placeholder-slate-500 py-1 max-h-24"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || loading || disabled}
          className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 size={18} className="animate-spin text-white" />
            : <Send size={18} className="text-white" />}
        </button>
      </div>
    </motion.div>
  )
}
