import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, X, RefreshCw, Upload, AlertCircle } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function LiveCameraModal({ isOpen, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasPermission, setHasPermission] = useState<boolean>(false)

  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setStream(null)
  }, [])

  const startStream = useCallback(async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not supported on this browser.')
      }

      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      streamRef.current = mediaStream
      setStream(mediaStream)
      setHasPermission(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn('Camera access error:', err)
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. You can still choose a photo from your files.'
          : 'Unable to access live camera on this device. Choose a photo below.'
      )
      setHasPermission(false)
    }
  }, [facingMode])

  useEffect(() => {
    if (isOpen) {
      startStream()
    } else {
      stopStream()
    }
    return () => {
      stopStream()
    }
  }, [isOpen, startStream, stopStream])

  const handleSnap = () => {
    const video = videoRef.current
    if (!video) return

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white border-2 border-orange-100 rounded-3xl p-5 max-w-lg w-full shadow-2xl relative flex flex-col text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-2xl">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">Look through your lens</h3>
              <p className="text-xs text-slate-500 mt-1">Point at something interesting to discover</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-orange-100 shadow-inner">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center">
              <AlertCircle size={36} className="text-amber-400 mb-2" />
              <p className="text-xs text-slate-300 mb-4 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
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
              <div className="absolute inset-4 pointer-events-none border-2 border-white/30 rounded-xl" />
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
            className="text-xs font-bold text-slate-500 hover:text-orange-600 flex items-center gap-1.5 cursor-pointer transition-colors"
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
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white rounded-2xl font-black text-sm shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all flex items-center gap-2 cursor-pointer"
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
