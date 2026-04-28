import Avatar from './Avatar'
import { formatTs } from '../utils/time'

export default function MessageBubble({ msg, isMine, isGrouped, showAvatar, isRead }) {
  const time = formatTs(new Date(msg.created_at).getTime())

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
      <div className="w-7 flex-shrink-0">
        {!isMine && showAvatar && <Avatar name={msg.display_name || msg.username} size={7} />}
      </div>
      <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && showAvatar && (
          <span className="text-xs text-slate-400 mb-1 ml-1">{msg.display_name || msg.username}</span>
        )}
        <div className={`relative rounded-2xl px-3 py-2 shadow-sm text-sm
          ${isMine ? 'bg-brand-500 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm'}`}>
          <Content msg={msg} />
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-brand-200' : 'text-slate-500'}`}>{time}</span>
            {isMine && <ReadTick isRead={isRead} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Content({ msg }) {
  const { type, body, file_url, file_name, file_size } = msg

  if (type === 'image' && file_url) return (
    <div>
      <a href={file_url} target="_blank" rel="noreferrer">
        <img src={file_url} alt={file_name} className="rounded-lg max-w-[240px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition" loading="lazy" />
      </a>
    </div>
  )

  if (type === 'video' && file_url) return <video src={file_url} controls className="rounded-lg max-w-[240px]" />

  if (type === 'audio' && file_url) return <audio src={file_url} controls className="max-w-[220px]" />

  if ((type === 'file') && file_url) return (
    <a href={file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80 transition">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate max-w-[180px]">{file_name || 'File'}</div>
        <div className="text-xs opacity-60">{file_size ? formatBytes(file_size) : ''} · Download</div>
      </div>
    </a>
  )

  return <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>
}

function ReadTick({ isRead }) {
  const color = isRead ? '#93c5fd' : 'rgba(255,255,255,0.5)'
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="flex-shrink-0">
      <path d="M1 5.5L4.5 9L11 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5.5L8.5 9L15 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}
