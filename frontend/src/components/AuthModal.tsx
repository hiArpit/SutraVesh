import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogIn, UserPlus, X, LogOut } from 'lucide-react'
import { registerApi, loginApi } from '../api/client'

interface Props {
  user: { username: string; display_name: string } | null
  onAuthChange: (user: { username: string; display_name: string } | null) => void
  onLogout: () => void
}

export default function AuthModal({ user, onAuthChange, onLogout }: Props) {
  const [isOpen, setIsOpen] = useState(false)
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
      setIsOpen(false)
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
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full text-xs shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-slate-200">Hi, {user.display_name}</span>
          <button
            onClick={onLogout}
            title="Log out"
            className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 bg-violet-600/90 hover:bg-violet-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <LogIn size={13} />
          <span>Login / Register</span>
        </button>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border-2 border-violet-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-600/20 text-violet-400 rounded-xl">
                  {isRegister ? <UserPlus size={22} /> : <User size={22} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isRegister ? 'Create Player Account' : 'Welcome Back'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRegister ? 'Save your badges & quests across devices' : 'Log in to continue your journey'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-3 p-2.5 bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {isRegister && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="e.g. Astro Explorer"
                      className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : isRegister ? 'Register & Start' : 'Log In'}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setError('') }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
                >
                  {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
