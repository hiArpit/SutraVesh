import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, X, RefreshCw, Upload, AlertCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function LiveCameraModal({ isOpen, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean>(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const startStream = useCallback(async (mode: 'environment' | 'user') => {
    stopStream()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setHasPermission(true)
    } catch (err: any) {
      console.warn('Camera stream error:', err)
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera permissions in your browser, or choose a photo below!'
          : 'Could not access a live camera on this device. You can choose a photo from your files below!'
      )
      setHasPermission(false)
    }
  }, [stopStream])

  useEffect(() => {
    if (isOpen) {
      startStream(facingMode)
    } else {
      stopStream()
    }
    return () => {
      stopStream()
    }
  }, [isOpen, facingMode, startStream, stopStream])

  const handleSnap = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        onCapture(file)
        onClose()
      },
      'image/jpeg',
      0.9
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      stopStream()
      onCapture(file)
      onClose()
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-slate-900 border-2 border-violet-500/60 rounded-3xl p-5 max-w-lg w-full shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-600/20 text-violet-400 rounded-xl">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Look through your lens</h3>
              <p className="text-xs text-slate-400">Point at something interesting to discover</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center">
              <AlertCircle size={36} className="text-amber-400 mb-2" />
              <p className="text-xs text-slate-300 mb-4 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Upload size={14} />
                <span>Choose photo from device</span>
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Corner framing brackets for a lens feel */}
              <div className="absolute inset-4 pointer-events-none border-2 border-white/20 rounded-xl" />
            </>
          )}

          {/* Flip camera toggle button */}
          {hasPermission && !error && (
            <button
              type="button"
              onClick={toggleCamera}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-sm cursor-pointer shadow-md transition-all"
              title="Flip camera"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-4 px-2">
          {/* File picker alternative */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-slate-400 hover:text-violet-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload size={14} />
            <span>Choose a photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Big Tactile Snap Button */}
          {hasPermission && !error && (
            <button
              type="button"
              onClick={handleSnap}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-b-4 border-violet-800 active:border-b-0 active:translate-y-1"
            >
              <Camera size={18} />
              <span>Snap!</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
