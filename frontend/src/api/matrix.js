// ─── Config ────────────────────────────────────────────────────────────────

let _cfg = {
  homeserver: '',
  accessToken: '',
  userId: '',
}

export function setConfig(homeserver, accessToken, userId) {
  _cfg = { homeserver: homeserver.replace(/\/$/, ''), accessToken, userId }
}

export function getHomeserver() { return _cfg.homeserver }
export function getAccessToken() { return _cfg.accessToken }
export function getCurrentUserId() { return _cfg.userId }

// ─── Media URL helper ──────────────────────────────────────────────────────

export function getMediaUrl(mxcUrl) {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) return null
  const [serverName, mediaId] = mxcUrl.slice(6).split('/')
  return `${_cfg.homeserver}/_matrix/media/v3/download/${serverName}/${mediaId}`
}

// ─── Base request ──────────────────────────────────────────────────────────

async function req(method, path, body = null, extraHeaders = {}) {
  const headers = {
    ...(body !== null ? { 'Content-Type': 'application/json' } : {}),
    ...(_cfg.accessToken ? { Authorization: `Bearer ${_cfg.accessToken}` } : {}),
    ...extraHeaders,
  }

  const res = await fetch(`${_cfg.homeserver}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || data.errcode || `HTTP ${res.status}`)
    err.errcode = data.errcode
    err.status = res.status
    throw err
  }

  return data
}

// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Handles both "no verification" (dummy auth) and "email required" server flows.
 */
export async function register(homeserver, username, password, displayName) {
  const hs = homeserver.replace(/\/$/, '')

  // Step 1: kick off registration to discover flows
  const initRes = await fetch(`${hs}/_matrix/client/v3/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'user',
      username,
      password,
      initial_device_display_name: 'Matrix Messenger',
    }),
  })

  const initData = await initRes.json()

  let userData = null

  if (initRes.status === 200) {
    // Server allows registration without any auth stage
    userData = initData
  } else if (initRes.status === 401) {
    const { session, flows = [] } = initData
    const allStages = flows.flatMap(f => f.stages || [])

    if (allStages.includes('m.login.email.identity')) {
      // Server requires email verification — tell user to configure SMTP
      throw new Error(
        'This server requires email verification. ' +
        'Configure SMTP in your Synapse settings, or set enable_registration_without_verification: true.'
      )
    }

    // Use dummy auth (most permissive flow)
    const finalRes = await fetch(`${hs}/_matrix/client/v3/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'user',
        username,
        password,
        auth: { type: 'm.login.dummy', session },
        initial_device_display_name: 'Matrix Messenger',
      }),
    })

    const finalData = await finalRes.json()
    if (!finalRes.ok) throw new Error(finalData.error || 'Registration failed')
    userData = finalData
  } else {
    throw new Error(initData.error || 'Registration failed')
  }

  // Step 2: set display name
  if (displayName && userData.access_token) {
    await fetch(
      `${hs}/_matrix/client/v3/profile/${encodeURIComponent(userData.user_id)}/displayname`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userData.access_token}`,
        },
        body: JSON.stringify({ displayname: displayName }),
      }
    ).catch(() => {})
  }

  return userData
}

export async function login(homeserver, username, password) {
  const hs = homeserver.replace(/\/$/, '')

  const res = await fetch(`${hs}/_matrix/client/v3/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: username },
      password,
      initial_device_display_name: 'Matrix Messenger',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data
}

export async function logout() {
  return req('POST', '/_matrix/client/v3/logout', {})
}

export async function getProfile(userId) {
  return req('GET', `/_matrix/client/v3/profile/${encodeURIComponent(userId)}`)
}

// ─── Sync ──────────────────────────────────────────────────────────────────

export async function sync(since = null, timeout = 30000, abortSignal = null) {
  const params = new URLSearchParams({
    timeout: since ? String(timeout) : '0',
    ...(since ? { since } : { full_state: 'true' }),
  })

  const res = await fetch(`${_cfg.homeserver}/_matrix/client/v3/sync?${params}`, {
    headers: { Authorization: `Bearer ${_cfg.accessToken}` },
    signal: abortSignal,
  })

  if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  return res.json()
}

// ─── Rooms ─────────────────────────────────────────────────────────────────

export async function createDMRoom(targetUserId) {
  return req('POST', '/_matrix/client/v3/createRoom', {
    invite: [targetUserId],
    is_direct: true,
    preset: 'trusted_private_chat',
    visibility: 'private',
    initial_state: [],
  })
}

export async function joinRoom(roomIdOrAlias) {
  return req('POST', `/_matrix/client/v3/join/${encodeURIComponent(roomIdOrAlias)}`, {})
}

// ─── Messages ──────────────────────────────────────────────────────────────

let _txn = Date.now()

export async function sendTextMessage(roomId, body) {
  const txnId = `${Date.now()}_${_txn++}`
  return req(
    'PUT',
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    { msgtype: 'm.text', body }
  )
}

export async function sendFileMessage(roomId, file) {
  // 1 — upload to media repo
  const uploadRes = await fetch(
    `${_cfg.homeserver}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        Authorization: `Bearer ${_cfg.accessToken}`,
      },
      body: file,
    }
  )

  if (!uploadRes.ok) throw new Error('File upload failed')
  const { content_uri } = await uploadRes.json()

  // 2 — pick msgtype
  let msgtype = 'm.file'
  if (file.type.startsWith('image/')) msgtype = 'm.image'
  else if (file.type.startsWith('video/')) msgtype = 'm.video'
  else if (file.type.startsWith('audio/')) msgtype = 'm.audio'

  const txnId = `${Date.now()}_${_txn++}`
  return req(
    'PUT',
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
    {
      msgtype,
      body: file.name,
      url: content_uri,
      info: { size: file.size, mimetype: file.type },
    }
  )
}

// ─── Read receipts ─────────────────────────────────────────────────────────

export async function sendReadReceipt(roomId, eventId) {
  return req(
    'POST',
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/receipt/m.read/${encodeURIComponent(eventId)}`,
    {}
  ).catch(() => {}) // non-critical
}

// ─── User directory ────────────────────────────────────────────────────────

export async function searchUsers(query) {
  return req('POST', '/_matrix/client/v3/user_directory/search', {
    search_term: query,
    limit: 20,
  })
}
