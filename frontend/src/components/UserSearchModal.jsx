import { useState, useCallback, useRef } from 'react'
import useStore from '../store'
import * as mx from '../api/matrix'
import Avatar from './Avatar'

export default function UserSearchModal({ onClose, onOpenRoom }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(null)
  const debounceRef = useRef(null)

  const { userId, rooms, directMap } = useStore()

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await mx.searchUsers(q)
        setResults((data.results || []).filter(u => u.user_id !== userId))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [userId])

  function handleInput(e) {
    setQuery(e.target.value)
    search(e.target.value)
  }

  async function openChat(targetUserId) {
    setCreating(targetUserId)
    try {
      // check if DM room already exists
      const existingRooms = directMap[targetUserId] || []
      const existingId = existingRooms.find(rid => rooms[rid])

      let roomId = existingId
      if (!roomId) {
        const data = await mx.createDMRoom(targetUserId)
        roomId = data.room_id
      }

      onOpenRoom(roomId)
      onClose()
    } catch (err) {
      alert('Could not open chat: ' + err.message)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500 text-sm"
            placeholder="Search by @username or display name…"
            value={query}
            onChange={handleInput}
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="py-8 text-center text-slate-500 text-sm">Searching…</div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="py-8 text-center text-slate-500 text-sm">No users found</div>
          )}
          {!loading && !query.trim() && (
            <div className="py-8 text-center text-slate-500 text-sm">
              Type a username to start
            </div>
          )}
          {results.map(user => (
            <button
              key={user.user_id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/60 transition text-left"
              onClick={() => openChat(user.user_id)}
              disabled={creating === user.user_id}
            >
              <Avatar name={user.display_name || user.user_id} avatarUrl={user.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-100 text-sm truncate">
                  {user.display_name || user.user_id}
                </div>
                <div className="text-xs text-slate-500 truncate">{user.user_id}</div>
              </div>
              {creating === user.user_id ? (
                <span className="text-xs text-slate-400">Opening…</span>
              ) : (
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
