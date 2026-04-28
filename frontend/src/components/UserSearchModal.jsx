import { useState, useRef } from 'react'
import useStore from '../store'
import * as api from '../api'
import Avatar from './Avatar'
import { getSocket } from '../hooks/useSocket'

export default function UserSearchModal({ onClose, onOpenConv }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(null)
  const debounce = useRef(null)
  const { upsertConversation } = useStore()

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await api.searchUsers(q)) }
      catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }

  async function openChat(user) {
    setCreating(user.id)
    try {
      const { id } = await api.openDM(user.id)
      upsertConversation({
        id,
        other_id: user.id,
        other_username: user.username,
        other_display_name: user.display_name,
        other_avatar_url: user.avatar_url,
        unread: 0,
      })
      getSocket()?.emit('join_conv', id)
      onOpenConv(id)
      onClose()
    } catch (err) {
      alert('Could not open chat: ' + err.message)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input autoFocus className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500 text-sm"
            placeholder="Search by @username or name…" value={query} onChange={handleInput} />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {loading && <div className="py-8 text-center text-slate-500 text-sm">Searching…</div>}
          {!loading && results.length === 0 && query.trim() && <div className="py-8 text-center text-slate-500 text-sm">No users found</div>}
          {!loading && !query.trim() && <div className="py-8 text-center text-slate-500 text-sm">Type a username to start</div>}
          {results.map(user => (
            <button key={user.id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/60 transition text-left"
              onClick={() => openChat(user)} disabled={creating === user.id}>
              <Avatar name={user.display_name || user.username} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-100 text-sm truncate">{user.display_name}</div>
                <div className="text-xs text-slate-500 truncate">@{user.username}</div>
              </div>
              {creating === user.id
                ? <span className="text-xs text-slate-400">Opening…</span>
                : <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
