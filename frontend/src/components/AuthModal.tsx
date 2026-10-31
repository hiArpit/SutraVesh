import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogIn, UserPlus, X, LogOut } from 'lucide-react'
import { registerApi, loginApi } from '../api/client'

interface Props {
  user: { username: string; display_name: string } | null
  onAuthChange: (user: { username: string; display_name: string } | null) => void
  onLogout: () => void
  isOpenExternal?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function AuthModal({ user, onAuthChange, onLogout, isOpenExternal, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isModalOpen = isOpenExternal !== undefined ? isOpenExternal : internalOpen

  const setOpen = (open: boolean) => {
    setInternalOpen(open)
    onOpenChange?.(open)
  }

  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        const res = await registerApi(username, password, displayName || username)
        onAuthChange(res.user)
      } else {
        const res = await loginApi(username, password)
        onAuthChange(res.user)
      }
      setOpen(false)
      setUsername('')
      setPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Top right trigger */}
      {user ? (
        <div className="flex items-center gap-2 bg-white border-2 border-orange-100 px-3.5 py-1.5 rounded-2xl text-xs shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-black text-slate-800">Hi, {user.display_name}</span>
          <button
            onClick={onLogout}
            title="Log out"
            className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-md border-b-2 border-orange-700 active:border-b-0 transition-all cursor-pointer"
        >
          <LogIn size={13} />
          <span>Login / Register</span>
        </button>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border-2 border-orange-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-slate-800"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                  {isRegister ? <UserPlus size={22} /> : <User size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {isRegister ? 'Join SutraVesh' : 'Welcome Back'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRegister ? 'Save your discovery trails across devices' : 'Log in to continue your adventure'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Display Name (optional)</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Curious Explorer"
                      className="w-full px-3.5 py-2 text-xs border-2 border-orange-100 rounded-xl focus:outline-none focus:border-orange-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-3.5 py-2 text-xs border-2 border-orange-100 rounded-xl focus:outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2 text-xs border-2 border-orange-100 rounded-xl focus:outline-none focus:border-orange-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:translate-y-0.5 text-white font-black text-xs rounded-xl shadow-md border-b-2 border-orange-700 active:border-b-0 transition-all cursor-pointer mt-2"
                >
                  {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Log In'}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError('')
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
