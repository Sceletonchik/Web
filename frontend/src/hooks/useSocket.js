import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import useStore from '../store'

const BASE = import.meta.env.VITE_API_URL || ''

let _socket = null

export function getSocket() { return _socket }

export function useSocket() {
  const { token, userId, conversations, appendMessage,
          upsertConversation, incrementUnread, setReadReceipt, activeConvId } = useStore()
  const activeRef = useRef(activeConvId)

  useEffect(() => { activeRef.current = activeConvId }, [activeConvId])

  useEffect(() => {
    if (!token) return

    _socket = io(BASE, { auth: { token }, transports: ['websocket'] })

    _socket.on('connect', () => {
      const ids = Object.keys(useStore.getState().conversations)
      if (ids.length) _socket.emit('join', ids)
    })

    _socket.on('message', (msg) => {
      appendMessage(msg)
      // Update last message in conversation list
      upsertConversation({
        id: msg.conversation_id,
        last_body: msg.body || msg.file_name,
        last_type: msg.type,
        last_ts: msg.created_at,
        last_sender_id: msg.sender_id,
      })
      if (msg.sender_id !== userId) {
        incrementUnread(msg.conversation_id)
      }
    })

    _socket.on('read', ({ conversation_id, user_id, last_read_msg }) => {
      setReadReceipt(conversation_id, user_id, last_read_msg)
    })

    return () => {
      _socket?.disconnect()
      _socket = null
    }
  }, [token])

  // Join new conversation rooms as they appear
  useEffect(() => {
    if (!_socket?.connected) return
    const ids = Object.keys(conversations)
    if (ids.length) _socket.emit('join', ids)
  }, [Object.keys(conversations).join(',')])
}
