import { create } from 'zustand'

const save = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
const load = (k, fb = '') => { try { return localStorage.getItem(k) ?? fb } catch { return fb } }

const useStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────────────────
  token:       load('token'),
  userId:      load('userId'),
  username:    load('username'),
  displayName: load('displayName'),

  setAuth: ({ token, user }) => {
    save('token',       token)
    save('userId',      user.id)
    save('username',    user.username)
    save('displayName', user.display_name)
    set({ token, userId: user.id, username: user.username, displayName: user.display_name })
  },

  clearAuth: () => {
    ['token','userId','username','displayName'].forEach(k => {
      try { localStorage.removeItem(k) } catch {}
    })
    set({ token: '', userId: '', username: '', displayName: '',
          conversations: {}, messages: {}, readReceipts: {}, activeConvId: null })
  },

  // ── Conversations ────────────────────────────────────────────────────────
  // { [id]: { id, other_id, other_username, other_display_name, other_avatar_url,
  //           last_body, last_ts, last_sender_id, my_last_read, unread } }
  conversations: {},

  setConversations: (list) => {
    const map = {}
    for (const c of list) map[c.id] = { ...c, unread: 0 }
    set({ conversations: map })
  },

  upsertConversation: (c) =>
    set(s => ({ conversations: { ...s.conversations, [c.id]: { ...s.conversations[c.id], ...c } } })),

  incrementUnread: (id) =>
    set(s => {
      if (s.activeConvId === id) return {}
      const c = s.conversations[id]
      if (!c) return {}
      return { conversations: { ...s.conversations, [id]: { ...c, unread: (c.unread || 0) + 1 } } }
    }),

  clearUnread: (id) =>
    set(s => {
      const c = s.conversations[id]
      if (!c) return {}
      return { conversations: { ...s.conversations, [id]: { ...c, unread: 0 } } }
    }),

  // ── Messages ─────────────────────────────────────────────────────────────
  messages: {},

  setMessages: (convId, msgs) =>
    set(s => ({ messages: { ...s.messages, [convId]: msgs } })),

  appendMessage: (msg) =>
    set(s => {
      const existing = s.messages[msg.conversation_id] || []
      if (existing.find(m => m.id === msg.id)) return {}
      return { messages: { ...s.messages, [msg.conversation_id]: [...existing, msg] } }
    }),

  // ── Read receipts  { [convId]: { [userId]: messageId } } ─────────────────
  readReceipts: {},

  setReadReceipt: (convId, userId, msgId) =>
    set(s => ({
      readReceipts: {
        ...s.readReceipts,
        [convId]: { ...(s.readReceipts[convId] || {}), [userId]: msgId },
      },
    })),

  // ── Active conversation ───────────────────────────────────────────────────
  activeConvId: null,
  setActiveConv: (id) => set({ activeConvId: id }),
}))

export default useStore
