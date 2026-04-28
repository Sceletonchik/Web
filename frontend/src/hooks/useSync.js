import { useEffect, useRef } from 'react'
import useStore from '../store'
import * as mx from '../api/matrix'

// Parse a room's timeline events into our message format
function parseEvents(events = []) {
  return events
    .filter(e => e.type === 'm.room.message')
    .map(e => ({
      id: e.event_id,
      roomId: e.room_id,
      sender: e.sender,
      body: e.content?.body || '',
      msgtype: e.content?.msgtype || 'm.text',
      url: e.content?.url || null,
      info: e.content?.info || null,
      ts: e.origin_server_ts,
    }))
}

// Parse read receipts for a room
function parseReceipts(ephemeral = {}) {
  const map = {}
  const events = ephemeral?.events || []
  for (const ev of events) {
    if (ev.type !== 'm.receipt') continue
    for (const [eventId, byUser] of Object.entries(ev.content || {})) {
      const users = byUser['m.read'] || {}
      for (const userId of Object.keys(users)) {
        map[userId] = eventId
      }
    }
  }
  return map
}

// Resolve a human-readable room name (for DMs: other user's display name)
async function resolveRoomName(roomId, members, dmUserId, myUserId) {
  if (dmUserId) {
    try {
      const profile = await mx.getProfile(dmUserId)
      return profile.displayname || dmUserId
    } catch {
      return dmUserId
    }
  }
  // group room — pick first member that isn't us
  const others = Object.keys(members).filter(u => u !== myUserId)
  if (others.length === 1) {
    try {
      const profile = await mx.getProfile(others[0])
      return profile.displayname || others[0]
    } catch {
      return others[0]
    }
  }
  return `Room ${roomId.slice(1, 9)}`
}

export function useSync() {
  const {
    homeserver, accessToken, userId,
    syncToken, setSyncToken,
    upsertRoom, appendMessages, incrementUnread,
    updateReadReceipts, setDirectMap, activeRoomId,
  } = useStore()

  const abortRef = useRef(null)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!accessToken || !homeserver) return

    mx.setConfig(homeserver, accessToken, userId)

    runningRef.current = true

    async function loop(since) {
      while (runningRef.current) {
        try {
          const ctrl = new AbortController()
          abortRef.current = ctrl

          const data = await mx.sync(since || null, 30000, ctrl.signal)
          if (!runningRef.current) break

          const nextToken = data.next_batch
          setSyncToken(nextToken)

          // ── Account data: m.direct map ───────────────────────────────
          const acctDirect = data.account_data?.events?.find(e => e.type === 'm.direct')
          const directMap = acctDirect?.content || {}
          setDirectMap(directMap)

          // reverse map: roomId → userId
          const roomToUser = {}
          for (const [uid, roomIds] of Object.entries(directMap)) {
            for (const rid of roomIds) roomToUser[rid] = uid
          }

          // ── Process joined rooms ─────────────────────────────────────
          const joined = data.rooms?.join || {}

          for (const [roomId, roomData] of Object.entries(joined)) {
            const state = roomData.state?.events || []
            const timeline = roomData.timeline?.events || []
            const ephemeral = roomData.ephemeral

            // members
            const members = {}
            for (const ev of [...state, ...timeline]) {
              if (ev.type === 'm.room.member' && ev.content?.membership === 'join') {
                members[ev.state_key] = ev.content
              }
            }

            const dmUserId = roomToUser[roomId] ||
              (Object.keys(members).find(u => u !== userId))

            const msgs = parseEvents(timeline.map(e => ({ ...e, room_id: roomId })))

            const lastMsg = msgs.at(-1)

            if (!useStore.getState().rooms[roomId]) {
              // new room — resolve name async
              const name = await resolveRoomName(roomId, members, dmUserId, userId)
              upsertRoom({
                id: roomId,
                name,
                dmUserId: dmUserId || null,
                lastMessage: lastMsg?.body || '',
                lastTs: lastMsg?.ts || 0,
                unread: 0,
                members,
              })
            } else if (lastMsg) {
              const existingRoom = useStore.getState().rooms[roomId]
              upsertRoom({
                id: roomId,
                lastMessage: lastMsg.body,
                lastTs: lastMsg.ts,
                members,
              })
              // update name if it changed (e.g. display name resolved)
              if (!existingRoom.name || existingRoom.name.startsWith('Room ')) {
                const name = await resolveRoomName(roomId, members, existingRoom.dmUserId, userId)
                upsertRoom({ id: roomId, name })
              }
            }

            if (msgs.length) {
              appendMessages(roomId, msgs)
              // increment unread only for messages from others
              const incoming = msgs.filter(m => m.sender !== userId)
              if (incoming.length && roomId !== useStore.getState().activeRoomId) {
                for (let i = 0; i < incoming.length; i++) incrementUnread(roomId)
              }
            }

            // read receipts
            const receipts = parseReceipts(ephemeral)
            if (Object.keys(receipts).length) {
              updateReadReceipts(roomId, receipts)
            }
          }

          // ── Invited rooms: auto-accept DM invites ───────────────────
          const invited = data.rooms?.invite || {}
          for (const roomId of Object.keys(invited)) {
            mx.joinRoom(roomId).catch(() => {})
          }

          since = nextToken
        } catch (err) {
          if (err.name === 'AbortError') break
          if (err.status === 401) { useStore.getState().clearAuth(); break }
          // back-off on error
          await new Promise(r => setTimeout(r, 3000))
        }
      }
    }

    loop(useStore.getState().syncToken)

    return () => {
      runningRef.current = false
      abortRef.current?.abort()
    }
  }, [accessToken, homeserver, userId])
}
