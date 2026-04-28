import { create } from 'zustand'

const persist = (key, value) => { try { localStorage.setItem(key, value) } catch {} }
const load = (key, fallback = '') => { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }

const useStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────────────────
  homeserver:   load('mx_homeserver'),
  accessToken:  load('mx_access_token'),
  userId:       load('mx_user_id'),
  displayName:  load('mx_display_name'),

  setAuth: ({ homeserver, accessToken, userId, displayName }) => {
    persist('mx_homeserver',   homeserver)
    persist('mx_access_token', accessToken)
    persist('mx_user_id',      userId)
    persist('mx_display_name', displayName || '')
    set({ homeserver, accessToken, userId, displayName: displayName || '' })
  },

  clearAuth: () => {
    ['mx_homeserver','mx_access_token','mx_user_id','mx_display_name'].forEach(k => {
      try { localStorage.removeItem(k) } catch {}
    })
    set({
      homeserver: '', accessToken: '', userId: '', displayName: '',
      rooms: {}, messages: {}, readReceipts: {}, syncToken: null,
      activeRoomId: null,
    })
  },

  // ── Rooms ────────────────────────────────────────────────────────────────
  // { [roomId]: { id, name, dmUserId, lastMessage, lastTs, unread, members } }
  rooms: {},

  upsertRoom: (room) =>
    set(s => ({ rooms: { ...s.rooms, [room.id]: { ...s.rooms[room.id], ...room } } })),

  incrementUnread: (roomId) =>
    set(s => {
      if (s.activeRoomId === roomId) return {}
      const r = s.rooms[roomId]
      if (!r) return {}
      return { rooms: { ...s.rooms, [roomId]: { ...r, unread: (r.unread || 0) + 1 } } }
    }),

  clearUnread: (roomId) =>
    set(s => {
      const r = s.rooms[roomId]
      if (!r) return {}
      return { rooms: { ...s.rooms, [roomId]: { ...r, unread: 0 } } }
    }),

  // ── Messages ─────────────────────────────────────────────────────────────
  // { [roomId]: Message[] }   (oldest → newest)
  messages: {},

  appendMessages: (roomId, newMsgs) =>
    set(s => {
      const existing = s.messages[roomId] || []
      const ids = new Set(existing.map(m => m.id))
      const fresh = newMsgs.filter(m => !ids.has(m.id))
      if (!fresh.length) return {}
      return { messages: { ...s.messages, [roomId]: [...existing, ...fresh] } }
    }),

  // ── Read receipts ─────────────────────────────────────────────────────────
  // { [roomId]: { [userId]: eventId } }
  readReceipts: {},

  updateReadReceipts: (roomId, map) =>
    set(s => ({
      readReceipts: {
        ...s.readReceipts,
        [roomId]: { ...(s.readReceipts[roomId] || {}), ...map },
      },
    })),

  // ── Active room ───────────────────────────────────────────────────────────
  activeRoomId: null,
  setActiveRoom: (id) => set({ activeRoomId: id }),

  // ── Sync ─────────────────────────────────────────────────────────────────
  syncToken: null,
  setSyncToken: (t) => set({ syncToken: t }),

  // ── Direct-room map ───────────────────────────────────────────────────────
  // { [userId]: roomId[] }   from m.direct account data
  directMap: {},
  setDirectMap: (map) => set({ directMap: map }),
}))

export default useStore
