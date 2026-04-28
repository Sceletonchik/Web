import { useState } from 'react'
import useStore from '../store'
import Avatar from './Avatar'
import UserSearchModal from './UserSearchModal'
import { formatTs } from '../utils/time'

export default function Sidebar({ onLogout }) {
  const { conversations, activeConvId, setActiveConv, clearUnread, username, displayName } = useStore()
  const [showSearch, setShowSearch] = useState(false)

  const sorted = Object.values(conversations).sort((a, b) => {
    const ta = a.last_ts ? new Date(a.last_ts).getTime() : 0
    const tb = b.last_ts ? new Date(b.last_ts).getTime() : 0
    return tb - ta
  })

  function openConv(id) {
    setActiveConv(id)
    clearUnread(id)
  }

  return (
    <>
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-slate-700/60 h-full" style={{ background: 'rgb(17 24 39)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-slate-100 text-base">Chats</span>
          </div>
          <button onClick={() => setShowSearch(true)} title="New chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {sorted.length === 0 && (
            <div className="px-4 py-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-slate-400 text-sm">No chats yet</p>
              <p className="text-slate-600 text-xs mt-1">Click ✏️ to find someone</p>
            </div>
          )}
          {sorted.map(conv => (
            <button key={conv.id} onClick={() => openConv(conv.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/40 transition text-left border-l-2
                ${activeConvId === conv.id ? 'bg-slate-700/60 border-brand-500' : 'border-transparent'}`}>
              <Avatar name={conv.other_display_name || conv.other_username || '?'} size={10} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-sm truncate ${activeConvId === conv.id ? 'text-white font-semibold' : 'text-slate-200 font-medium'}`}>
                    {conv.other_display_name || conv.other_username}
                  </span>
                  {conv.last_ts && <span className="text-xs text-slate-500 flex-shrink-0">{formatTs(new Date(conv.last_ts).getTime())}</span>}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-slate-500 truncate">
                    {conv.last_type === 'image' ? '📷 Photo'
                      : conv.last_type === 'video' ? '🎥 Video'
                      : conv.last_type === 'audio' ? '🎵 Audio'
                      : conv.last_type === 'file' ? `📎 ${conv.last_file_name || 'File'}`
                      : conv.last_body || 'No messages yet'}
                  </span>
                  {(conv.unread || 0) > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unread > 99 ? '99+' : conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-700/60 px-4 py-3 flex items-center gap-2">
          <Avatar name={displayName || username} size={8} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">@{username}</div>
          </div>
          <button onClick={onLogout} title="Sign out" className="text-slate-500 hover:text-red-400 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>
      {showSearch && <UserSearchModal onClose={() => setShowSearch(false)} onOpenConv={id => { openConv(id); setShowSearch(false) }} />}
    </>
  )
}
