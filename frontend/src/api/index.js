const BASE = import.meta.env.VITE_API_URL || ''

let _token = ''
export function setToken(t) { _token = t }
export function getToken() { return _token }

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function req(method, path, body = null) {
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (username, display_name, email, password) =>
  req('POST', '/api/auth/register', { username, display_name, email, password })

export const login = (username, password) =>
  req('POST', '/api/auth/login', { username, password })

export const getMe = () => req('GET', '/api/auth/me')

// ── Users ────────────────────────────────────────────────────────────────────
export const searchUsers = (q) => req('GET', `/api/users/search?q=${encodeURIComponent(q)}`)

// ── Conversations ─────────────────────────────────────────────────────────────
export const getConversations = () => req('GET', '/api/conversations')

export const openDM = (target_user_id) =>
  req('POST', '/api/conversations', { target_user_id })

// ── Messages ──────────────────────────────────────────────────────────────────
export const getMessages = (convId) =>
  req('GET', `/api/conversations/${convId}/messages`)

export const sendText = (convId, body) =>
  req('POST', `/api/conversations/${convId}/messages`, { body })

export const uploadFile = async (convId, file) => {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/api/conversations/${convId}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${_token}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data
}

export const markRead = (convId, message_id) =>
  req('POST', `/api/conversations/${convId}/read`, { message_id })
