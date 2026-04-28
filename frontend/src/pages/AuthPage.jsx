import { useState } from 'react'
import useStore from '../store'
import * as mx from '../api/matrix'

const DEFAULT_HS = import.meta.env.VITE_MATRIX_HOMESERVER || ''

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [homeserver, setHomeserver] = useState(DEFAULT_HS)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setAuth = useStore(s => s.setAuth)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const hs = homeserver.trim()
    if (!hs) return setError('Enter the homeserver URL')
    if (!username.trim()) return setError('Enter your username')
    if (!password) return setError('Enter password')

    if (tab === 'register') {
      if (!displayName.trim()) return setError('Enter your display name')
      if (password !== confirm) return setError('Passwords do not match')
      if (password.length < 8) return setError('Password must be at least 8 characters')
    }

    setLoading(true)
    try {
      let data
      if (tab === 'register') {
        data = await mx.register(hs, username.trim().toLowerCase(), password, displayName.trim())
      } else {
        data = await mx.login(hs, username.trim().toLowerCase(), password)
      }

      // fetch display name from profile
      let dname = displayName
      if (!dname && data.user_id) {
        mx.setConfig(hs, data.access_token, data.user_id)
        const profile = await mx.getProfile(data.user_id).catch(() => ({}))
        dname = profile.displayname || data.user_id
      }

      setAuth({
        homeserver: hs,
        accessToken: data.access_token,
        userId: data.user_id,
        displayName: dname,
      })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = `
    w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5
    text-slate-100 placeholder-slate-500 text-sm
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
    transition
  `

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Matrix Messenger</h1>
          <p className="text-slate-400 text-sm mt-1">Secure · Decentralised · Open</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-900/60 p-1 mb-6">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Homeserver URL</label>
              <input
                className={inputCls}
                placeholder="https://synapse.onrender.com"
                value={homeserver}
                onChange={e => setHomeserver(e.target.value)}
                disabled={loading}
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                <input
                  className={inputCls}
                  placeholder="Your Name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Username
                {tab === 'register' && (
                  <span className="text-slate-500 ml-1">(your @username — like Telegram)</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">@</span>
                <input
                  className={`${inputCls} pl-7`}
                  placeholder="username"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-z0-9._\-]/gi, '').toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                className={inputCls}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                         text-white font-semibold text-sm transition shadow-lg shadow-brand-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? (tab === 'register' ? 'Creating account…' : 'Signing in…')
                : (tab === 'register' ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Powered by the Matrix Protocol
        </p>
      </div>
    </div>
  )
}
