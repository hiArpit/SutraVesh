import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Camera, Upload, Info } from 'lucide-react'
import type { PlayMode, QuestLevel, UserProfile } from '../types/game'
import QuestJourneyModal from './QuestJourneyModal'

interface Props {
  onStart: (mode: PlayMode, seed: string, target?: string, levelNumber?: number) => void
  onCaptureImage?: (file: File) => void
  onExploreMap?: () => void
  onOpenAuth?: () => void
  loading?: boolean
  currentUser?: UserProfile | null
}

export default function ModeSelector({
  onStart,
  onCaptureImage,
  onExploreMap,
  onOpenAuth,
  loading = false,
  currentUser,
}: Props) {
  const [showGuestBanner, setShowGuestBanner] = useState(false)
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false)
  const [isOpenCustomModal, setIsOpenCustomModal] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

  const openJourneyModal = () => {
    window.history.pushState({ modal: 'ladder' }, '', '#quest-ladder')
    setIsJourneyModalOpen(true)
  }
  const closeJourneyModal = () => {
    if (window.location.hash === '#quest-ladder') {
      window.history.back()
    }
    setIsJourneyModalOpen(false)
  }

  const openRulesModal = () => {
    window.history.pushState({ modal: 'rules' }, '', '#rules')
    setIsRulesModalOpen(true)
  }
  const closeRulesModal = () => {
    if (window.location.hash === '#rules') {
      window.history.back()
    }
    setIsRulesModalOpen(false)
  }

  const openCustomModal = () => {
    window.history.pushState({ modal: 'custom' }, '', '#custom-seed')
    openCustomModal()
  }
  const closeCustomModal = () => {
    if (window.location.hash === '#custom-seed') {
      window.history.back()
    }
    setIsOpenCustomModal(false)
  }

  // Handle browser back button (popstate) to close modals instead of exiting page
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash
      if (!hash || hash === '#home') {
        setIsJourneyModalOpen(false)
        setIsRulesModalOpen(false)
        setIsOpenCustomModal(false)
      } else {
        if (hash !== '#quest-ladder') setIsJourneyModalOpen(false)
        if (hash !== '#rules') setIsRulesModalOpen(false)
        if (hash !== '#custom-seed') setIsOpenCustomModal(false)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [seedInput, setSeedInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [hasTarget, setHasTarget] = useState(false)
  const [error, setError] = useState('')

  // In-page camera state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsCameraActive(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser.')
      }

      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
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
      setIsCameraActive(true)
    } catch (err: any) {
      console.warn('Camera access error:', err)
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. You can choose a photo from your files.'
          : 'Unable to access live camera. Please use the Choose button.'
      )
      setIsCameraActive(false)
    }
  }, [])

  // Only stop tracks on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Attach stream whenever camera is active and video element mounts
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(e => console.warn('Video play error:', e))
    }
  }, [isCameraActive, stream])

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
        const file = new File([blob], `discovery_snap_${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopCamera()
        if (onCaptureImage) {
          onCaptureImage(file)
        }
      },
      'image/jpeg',
      0.92
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onCaptureImage) {
      stopCamera()
      onCaptureImage(file)
    }
  }

  const handleSelectLevel = (level: QuestLevel) => {
    setIsJourneyModalOpen(false)
    const mode: PlayMode = level.target_wonder ? 'quest' : 'world'
    onStart(mode, level.starting_seed, level.target_wonder || undefined, level.level_number)
  }

  const handleStartCustomGame = (e: React.FormEvent) => {
    e.preventDefault()
    if (!seedInput.trim()) {
      setError('Please choose a starting wonder to explore!')
      return
    }

    const mode: PlayMode = hasTarget && targetInput.trim() ? 'quest' : 'world'
    onStart(mode, seedInput.trim(), hasTarget && targetInput.trim() ? targetInput.trim() : undefined)
    setIsOpenCustomModal(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-slate-800 flex flex-col items-center justify-start py-8 px-4 sm:px-6 relative">
      {/* Top Brand Pill Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6">
        <div onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); if (window.location.hash !== '#home') window.history.pushState({ screen: 'home' }, '', '#home'); }} className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity" title="SutraVesh Home">
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

        {/* Guest explorer badge & connection rule button */}
        <div className="flex items-center gap-2">
          <button
            onClick={openRulesModal}
            className="px-3 py-1.5 bg-white border border-orange-200 hover:border-orange-400 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            title="Learn how wonders connect"
          >
            <Info size={14} className="text-orange-500" />
            <span>Connection Rules</span>
          </button>
          {currentUser ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Explorer: {currentUser.display_name || currentUser.username}</span>
            </span>
          ) : (
            <span className="hidden sm:inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
              🌱 Guest Explorer Mode
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Discovery Experience (Reference Images 3 & 4) */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* LEFT COLUMN: Look Through Your Lens (Camera Viewfinder Card) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-orange-100 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between"
        >
          <div>
            {/* Header tag and icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 font-sans">
                BEST WAY TO BEGIN
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm shadow-inner">
                📷
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
              Look through your lens
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-5">
              Point at one interesting thing and let's explore it together.
            </p>

            {/* Viewfinder Area */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-slate-900 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center mb-5 border-4 border-slate-900/10">
              {isCameraActive ? (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el
                      if (el && stream && el.srcObject !== stream) {
                        el.srcObject = stream
                        el.play().catch(() => {})
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Live Lens</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 text-white">
                  <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center text-2xl mb-3 shadow-inner">
                    ✨📸
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mb-1">
                    Ready when you are!
                  </h3>
                  <p className="text-xs text-slate-400 font-medium max-w-xs">
                    Turn on your live camera or choose a picture from your files.
                  </p>
                </div>
              )}

              {/* In-viewfinder camera error */}
              {cameraError && (
                <div className="absolute bottom-3 left-3 right-3 bg-red-900/90 text-white text-xs p-2.5 rounded-xl text-center">
                  {cameraError}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Below Viewfinder */}
          <div className="flex items-center gap-3">
            {isCameraActive ? (
              <button
                type="button"
                onClick={handleSnap}
                disabled={loading}
                className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border-b-4 border-blue-800"
              >
                <Camera size={18} />
                <span>{loading ? 'Discovering...' : 'Snap!'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={loading}
                className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border-b-4 border-blue-800"
              >
                <Camera size={18} />
                <span>Turn on camera</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex-1 py-3.5 px-6 bg-slate-600 hover:bg-slate-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              <span>Choose</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Discovery Map Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border-2 border-orange-100 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between"
        >
          <div>
            {/* Header tag and icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-700 font-sans">
                YOUR LEARNING TRAIL
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-sm shadow-inner">
                ✨
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
              Discovery Map
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-5">
              Choose a wonder or climb through the 15 progressive quest levels!
            </p>

            {/* In-box Question Card */}
            <div className="bg-[#FAF6EE] border-2 border-dashed border-amber-200/80 rounded-2xl p-4 sm:p-5 mb-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-orange-600 flex items-center justify-center text-xl shrink-0 shadow-sm">
                🧭
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight mb-1">
                  Your map starts with a question
                </h3>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Explore an object and we'll connect it to related ideas. Each connection gives you discovery points!
                </p>
              </div>
            </div>

            {/* 4 Connection Rules Preview */}
            <div className="mb-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                How Wonders Connect:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-sky-50 border border-sky-100 rounded-xl">
                  <span className="font-bold text-sky-900 block mb-0.5">🌿 Material</span>
                  <span className="text-slate-600 text-[11px]">Tree ➔ Paper ➔ Book</span>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="font-bold text-amber-900 block mb-0.5">⚙️ Teamwork</span>
                  <span className="text-slate-600 text-[11px]">Pen & Paper, Spoon & Bowl</span>
                </div>
                <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                  <span className="font-bold text-orange-900 block mb-0.5">⚡ Energy</span>
                  <span className="text-slate-600 text-[11px]">Sun ➔ Plant, Ice ➔ Water</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="font-bold text-emerald-900 block mb-0.5">🐝 Habitat</span>
                  <span className="text-slate-600 text-[11px]">Bee & Flower, Bird & Nest</span>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery Map CTAs */}
          <div className="space-y-3">
            {/* Explore Discovery Map Button */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (currentUser) {
                    onExploreMap?.()
                  } else {
                    setShowGuestBanner(prev => !prev)
                  }
                }}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-emerald-800 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🗺️ Explore Discovery Map</span>
                <ArrowRight size={16} />
              </button>

              {/* Guest Warning Banner if clicked while logged out */}
              <AnimatePresence>
                {showGuestBanner && !currentUser && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden mt-2.5"
                  >
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex flex-col gap-2 text-left">
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0">🔒</span>
                        <p className="text-xs font-bold text-amber-900 leading-snug">
                          Sign in or Register to explore and save your permanent Discovery Map!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuth?.()
                          setShowGuestBanner(false)
                        }}
                        className="self-end py-1.5 px-3.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer transition-colors"
                      >
                        Sign in / Register now
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quest Ladder CTA */}
            <button
              type="button"
              onClick={openJourneyModal}
              className="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Play Quest Ladder (Levels 1–15)</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setSeedInput('')
                setTargetInput('')
                setHasTarget(false)
                setError('')
                setIsOpenCustomModal(true)
              }}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors cursor-pointer text-center"
            >
              Or start with a custom seed concept...
            </button>
          </div>
        </motion.div>
      </div>

      {/* 15-LEVEL QUEST JOURNEY MODAL */}
      <QuestJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={closeJourneyModal}
        onSelectLevel={handleSelectLevel}
        currentUser={currentUser}
      />

      {/* CONNECTION RULES EXPLANATION MODAL */}
      <AnimatePresence>
        {isRulesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={closeRulesModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-full cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl shadow-inner">
                  ✨
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    The 4 SutraVesh Connection Rules
                  </h3>
                  <p className="text-xs text-slate-500">How objects earn links and bonus points on your map</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl">
                  <h4 className="font-black text-sky-900 text-sm mb-1">🌿 1. Material & Ingredients ("Made From")</h4>
                  <p>When an object is made from, derived from, or contains another wonder. For example: <strong>Tree ➔ Paper ➔ Book</strong>, or <strong>Flour ➔ Bread</strong>.</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <h4 className="font-black text-amber-900 text-sm mb-1">⚙️ 2. Purpose & Teamwork ("Used Together")</h4>
                  <p>When two objects work together to solve a task or play. For example: <strong>Pen & Paper</strong>, <strong>Lock & Key</strong>, or <strong>Bat & Ball</strong>.</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl">
                  <h4 className="font-black text-orange-900 text-sm mb-1">⚡ 3. Energy & Transformation ("Powers or Changes")</h4>
                  <p>When one wonder fuels, heats, cools, or changes into another. For example: <strong>Sun ➔ Plant</strong>, <strong>Water ➔ Ice</strong>, or <strong>Fire ➔ Ash</strong>.</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <h4 className="font-black text-emerald-900 text-sm mb-1">🐝 4. Habitat & Ecosystem ("Lives Together")</h4>
                  <p>When objects exist together naturally in the wild or everyday habitat. For example: <strong>Bee & Flower</strong>, <strong>Bird & Nest</strong>, or <strong>Fish & Ocean</strong>.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRulesModal}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-2xl shadow transition-colors cursor-pointer"
              >
                Got it! Let's explore
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM WONDER MODAL */}
      <AnimatePresence>
        {isOpenCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={closeCustomModal}
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
                    Custom Discovery Topic
                  </h3>
                  <p className="text-xs text-slate-500">Pick any concept you wish to explore</p>
                </div>
              </div>

              <form onSubmit={handleStartCustomGame} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Starting Wonder Concept
                  </label>
                  <input
                    type="text"
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    placeholder="e.g. Telescope, Honeybee, Volcano..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasTarget}
                      onChange={e => setHasTarget(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 accent-orange-500"
                    />
                    <span className="text-xs font-bold text-slate-600">
                      Set a specific destination wonder (Quest Mode)
                    </span>
                  </label>
                </div>

                {hasTarget && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Target Destination Concept
                    </label>
                    <input
                      type="text"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      placeholder="e.g. Star, Forest, Diamond..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-2xl text-sm font-semibold outline-none transition-all"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-sm rounded-2xl shadow-md border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  <span>Start Exploring</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
