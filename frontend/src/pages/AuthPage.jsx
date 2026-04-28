import { useState } from 'react'
import useStore from '../store'
import * as api from '../api'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useStore(s => s.setAuth)

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const { username, display_name, email, password, confirm } = form
    if (!username.trim()) return setError('Enter username')
    if (!password) return setError('Enter password')
    if (tab === 'register') {
      if (!display_name.trim()) return setError('Enter your name')
      if (!email.trim()) return setError('Enter email')
      if (password.length < 8) return setError('Password must be at least 8 characters')
      if (password !== confirm) return setError('Passwords do not match')
    }
    setLoading(true)
    try {
      const data = tab === 'register'
        ? await api.register(username, display_name, email, password)
        : await api.login(username, password)
      api.setToken(data.token)
      setAuth(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition'

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Messenger</h1>
          <p className="text-slate-400 text-sm mt-1">Fast · Secure · Real-time</p>
        </div>
        <div className="bg-slate-800/70 backdrop-blur border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
          <div className="flex rounded-xl bg-slate-900/60 p-1 mb-6">
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-brand-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your Name</label>
                <input className={inp} placeholder="John Doe" value={form.display_name} onChange={setF('display_name')} disabled={loading} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Username {tab === 'register' && <span className="text-slate-500">(like @username in Telegram)</span>}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input className={`${inp} pl-7`} placeholder="username" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/[^a-z0-9._-]/gi,'').toLowerCase() }))}
                  autoCapitalize="none" autoCorrect="off" disabled={loading} />
              </div>
            </div>
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input type="email" className={inp} placeholder="you@example.com" value={form.email} onChange={setF('email')} disabled={loading} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input type="password" className={inp} placeholder="••••••••" value={form.password} onChange={setF('password')} disabled={loading} />
            </div>
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
                <input type="password" className={inp} placeholder="••••••••" value={form.confirm} onChange={setF('confirm')} disabled={loading} />
              </div>
            )}
            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? (tab === 'register' ? 'Creating…' : 'Signing in…') : (tab === 'register' ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
