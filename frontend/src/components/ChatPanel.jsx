import { useEffect, useRef, useState, useCallback } from 'react'
import useStore from '../store'
import * as mx from '../api/matrix'
import Avatar from './Avatar'
import MessageBubble from './MessageBubble'

export default function ChatPanel() {
  const { activeRoomId, rooms, messages, userId, readReceipts, clearUnread } = useStore()
  const room = activeRoomId ? rooms[activeRoomId] : null
  const msgs = activeRoomId ? (messages[activeRoomId] || []) : []

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  // Send read receipt for last message
  useEffect(() => {
    if (!activeRoomId || !msgs.length) return
    const last = msgs.at(-1)
    if (last && last.sender !== userId) {
      mx.sendReadReceipt(activeRoomId, last.id)
      clearUnread(activeRoomId)
    }
  }, [activeRoomId, msgs.length])

  async function sendText() {
    const body = text.trim()
    if (!body || !activeRoomId || sending) return
    setText('')
    setSending(true)
    try {
      await mx.sendTextMessage(activeRoomId, body)
    } catch (err) {
      alert('Send failed: ' + err.message)
      setText(body)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  async function sendFile(file) {
    if (!file || !activeRoomId) return
    setSending(true)
    try {
      await mx.sendFileMessage(activeRoomId, file)
    } catch (err) {
      alert('File upload failed: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText()
    }
  }

  // Drag & drop
  const onDragOver = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) sendFile(file)
  }, [activeRoomId])

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 select-none">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-slate-300 mb-1">Matrix Messenger</h2>
        <p className="text-slate-500 text-sm">Select a chat or start a new conversation</p>
      </div>
    )
  }

  // build read-receipt map for the last message of each sender
  const receiptsForRoom = readReceipts[activeRoomId] || {}
  // determine which messages the OTHER user has read
  const otherUserId = room?.dmUserId
  const otherReadEventId = otherUserId ? receiptsForRoom[otherUserId] : null

  return (
    <div
      className="flex-1 flex flex-col bg-slate-900 relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-40 bg-brand-500/20 border-2 border-dashed border-brand-500 rounded-lg
                        flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2">📎</div>
            <p className="text-brand-300 font-semibold">Drop to send file</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60 bg-slate-800/60 flex-shrink-0">
        <Avatar name={room?.name || '?'} size={9} />
        <div>
          <div className="font-semibold text-slate-100">{room?.name || 'Unknown'}</div>
          {otherUserId && (
            <div className="text-xs text-slate-500">{otherUserId}</div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 flex flex-col gap-1">
        {msgs.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm select-none">
            Say hello! 👋
          </div>
        )}

        {msgs.map((msg, i) => {
          const prev = msgs[i - 1]
          const isMine = msg.sender === userId
          const showAvatar = !isMine && (prev?.sender !== msg.sender)
          const isLastRead = otherReadEventId === msg.id
          const isGrouped = prev?.sender === msg.sender &&
                            msg.ts - (prev?.ts || 0) < 60_000

          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={isMine}
              isGrouped={isGrouped}
              showAvatar={showAvatar}
              isRead={isMine && isLastRead}
              roomName={room?.name}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-700/60">
        <div className="flex items-end gap-2 bg-slate-800 rounded-2xl border border-slate-700
                        focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/30 transition px-3 py-2">
          {/* File button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition mb-1"
            title="Send file"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0]
            if (f) { sendFile(f); e.target.value = '' }
          }} />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm outline-none resize-none
                       max-h-32 overflow-y-auto py-0.5 scrollbar-thin"
            placeholder="Message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
            style={{ lineHeight: '1.5rem' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
          />

          {/* Send button */}
          <button
            onClick={sendText}
            disabled={!text.trim() || sending}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                       bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed
                       transition mb-0.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1 px-1">Enter to send · Shift+Enter for new line · Drop files to upload</p>
      </div>
    </div>
  )
}
