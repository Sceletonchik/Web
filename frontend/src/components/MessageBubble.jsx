import Avatar from './Avatar'
import { getMediaUrl } from '../api/matrix'
import { formatTs } from '../utils/time'

export default function MessageBubble({ msg, isMine, isGrouped, showAvatar, isRead, roomName }) {
  const { body, msgtype, url, info, ts, sender } = msg

  const time = formatTs(ts)

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
      {/* Avatar — only for others, only on first in group */}
      <div className="w-7 flex-shrink-0">
        {!isMine && showAvatar && (
          <Avatar name={sender} size={7} />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isMine && showAvatar && (
          <span className="text-xs text-slate-400 mb-1 ml-1">
            {sender.split(':')[0].replace('@', '')}
          </span>
        )}

        <div className={`
          relative rounded-2xl px-3 py-2 shadow-sm text-sm
          ${isMine
            ? 'bg-brand-500 text-white rounded-br-sm'
            : 'bg-slate-700 text-slate-100 rounded-bl-sm'}
        `}>
          <Content msgtype={msgtype} body={body} url={url} info={info} />

          {/* Time + read status */}
          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-brand-200' : 'text-slate-500'}`}>{time}</span>
            {isMine && <ReadTick isRead={isRead} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Content({ msgtype, body, url, info }) {
  if (msgtype === 'm.image' && url) {
    const src = getMediaUrl(url)
    return (
      <div>
        <a href={src} target="_blank" rel="noreferrer">
          <img
            src={src}
            alt={body}
            className="rounded-lg max-w-[240px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition"
            loading="lazy"
          />
        </a>
        {body && <p className="text-xs mt-1 opacity-70">{body}</p>}
      </div>
    )
  }

  if (msgtype === 'm.video' && url) {
    return (
      <video
        src={getMediaUrl(url)}
        controls
        className="rounded-lg max-w-[240px]"
      />
    )
  }

  if (msgtype === 'm.audio' && url) {
    return <audio src={getMediaUrl(url)} controls className="max-w-[220px]" />
  }

  if ((msgtype === 'm.file' || url) && url) {
    const src = getMediaUrl(url)
    const size = info?.size ? `(${formatBytes(info.size)})` : ''
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 hover:opacity-80 transition"
      >
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate max-w-[180px]">{body || 'File'}</div>
          <div className="text-xs opacity-60">{size} · Download</div>
        </div>
      </a>
    )
  }

  // Plain text
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">{body}</p>
  )
}

// Telegram-style double ticks
function ReadTick({ isRead }) {
  const color = isRead ? '#93c5fd' : 'rgba(255,255,255,0.5)'
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="flex-shrink-0">
      {/* First tick */}
      <path d="M1 5.5L4.5 9L11 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Second tick (offset right) — visible = delivered/read */}
      <path d="M5 5.5L8.5 9L15 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}
