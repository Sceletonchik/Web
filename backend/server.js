require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { pool, initDB } = require('./db')
const auth = require('./auth.middleware')

const app = express()
const server = http.createServer(app)

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*'

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
})

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

// ── File uploads ────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

app.use('/uploads', express.static(UPLOAD_DIR))

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }))

// ── Auth ────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, display_name, email, password } = req.body
  if (!username || !display_name || !email || !password)
    return res.status(400).json({ error: 'All fields required' })

  const clean = username.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (clean.length < 3) return res.status(400).json({ error: 'Username too short (min 3)' })
  if (password.length < 8) return res.status(400).json({ error: 'Password too short (min 8)' })

  try {
    const hash = await bcrypt.hash(password, 12)
    const { rows } = await pool.query(
      `INSERT INTO users (username, display_name, email, password)
       VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, email`,
      [clean, display_name.trim(), email.trim().toLowerCase(), hash]
    )
    const user = rows[0]
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('username') ? 'Username' : 'Email'
      return res.status(409).json({ error: `${field} already taken` })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Fields required' })

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username=$1 OR email=$1',
      [username.toLowerCase().trim()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'User not found' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Wrong password' })

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' })
    const { password: _, ...safe } = user
    res.json({ token, user: safe })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/auth/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, display_name, email, avatar_url FROM users WHERE id=$1',
    [req.user.id]
  )
  res.json(rows[0])
})

// ── User search ─────────────────────────────────────────────────────────────
app.get('/api/users/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json([])

  const { rows } = await pool.query(
    `SELECT id, username, display_name, avatar_url FROM users
     WHERE (username ILIKE $1 OR display_name ILIKE $1) AND id != $2
     LIMIT 20`,
    [`%${q}%`, req.user.id]
  )
  res.json(rows)
})

// ── Conversations ────────────────────────────────────────────────────────────
app.get('/api/conversations', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      c.id,
      u.id         AS other_id,
      u.username   AS other_username,
      u.display_name AS other_display_name,
      u.avatar_url AS other_avatar_url,
      m.id         AS last_msg_id,
      m.body       AS last_body,
      m.type       AS last_type,
      m.file_name  AS last_file_name,
      m.created_at AS last_ts,
      m.sender_id  AS last_sender_id,
      rr.last_read_msg AS my_last_read
    FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id != $1
    JOIN users u ON u.id = cm2.user_id
    LEFT JOIN LATERAL (
      SELECT * FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    ) m ON true
    LEFT JOIN read_receipts rr ON rr.conversation_id = c.id AND rr.user_id = $1
    ORDER BY m.created_at DESC NULLS LAST
  `, [req.user.id])
  res.json(rows)
})

// Get or create DM conversation
app.post('/api/conversations', auth, async (req, res) => {
  const { target_user_id } = req.body
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id required' })

  // Check if exists
  const { rows: existing } = await pool.query(`
    SELECT c.id FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
    LIMIT 1
  `, [req.user.id, target_user_id])

  if (existing[0]) return res.json({ id: existing[0].id })

  // Create new
  const { rows } = await pool.query('INSERT INTO conversations DEFAULT VALUES RETURNING id')
  const convId = rows[0].id
  await pool.query(
    'INSERT INTO conversation_members VALUES ($1,$2),($1,$3)',
    [convId, req.user.id, target_user_id]
  )
  res.json({ id: convId })
})

// ── Messages ─────────────────────────────────────────────────────────────────
app.get('/api/conversations/:id/messages', auth, async (req, res) => {
  // Check membership
  const { rows: mem } = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  )
  if (!mem.length) return res.status(403).json({ error: 'Forbidden' })

  const before = req.query.before   // for pagination
  const { rows } = await pool.query(`
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1 ${before ? 'AND m.created_at < $3' : ''}
    ORDER BY m.created_at DESC
    LIMIT 50
    ${before ? '' : ''}
  `, before ? [req.params.id, 50, before] : [req.params.id])

  res.json(rows.reverse())
})

// Send text message (via REST, real-time via socket)
app.post('/api/conversations/:id/messages', auth, async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'Empty message' })

  const { rows: mem } = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  )
  if (!mem.length) return res.status(403).json({ error: 'Forbidden' })

  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, type, body)
     VALUES ($1,$2,'text',$3)
     RETURNING *`,
    [req.params.id, req.user.id, body.trim()]
  )
  const msg = await enrichMessage(rows[0])
  io.to(req.params.id).emit('message', msg)
  res.json(msg)
})

// File upload
app.post('/api/conversations/:id/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })

  const { rows: mem } = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  )
  if (!mem.length) return res.status(403).json({ error: 'Forbidden' })

  const fileUrl = `${process.env.BACKEND_URL || ''}/uploads/${req.file.filename}`
  const mime = req.file.mimetype
  const msgType = mime.startsWith('image/') ? 'image'
    : mime.startsWith('video/') ? 'video'
    : mime.startsWith('audio/') ? 'audio'
    : 'file'

  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, type, body, file_url, file_name, file_size, file_mime)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, req.user.id, msgType,
     req.file.originalname, fileUrl,
     req.file.originalname, req.file.size, mime]
  )
  const msg = await enrichMessage(rows[0])
  io.to(req.params.id).emit('message', msg)
  res.json(msg)
})

// Read receipt
app.post('/api/conversations/:id/read', auth, async (req, res) => {
  const { message_id } = req.body
  if (!message_id) return res.status(400).json({ error: 'message_id required' })

  await pool.query(`
    INSERT INTO read_receipts (conversation_id, user_id, last_read_msg, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET last_read_msg = $3, updated_at = NOW()
  `, [req.params.id, req.user.id, message_id])

  io.to(req.params.id).emit('read', {
    conversation_id: req.params.id,
    user_id: req.user.id,
    last_read_msg: message_id,
  })
  res.json({ ok: true })
})

// ── Helpers ──────────────────────────────────────────────────────────────────
async function enrichMessage(msg) {
  const { rows } = await pool.query(
    'SELECT username, display_name, avatar_url FROM users WHERE id=$1',
    [msg.sender_id]
  )
  return { ...msg, ...rows[0] }
}

// ── Socket.io ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Unauthorized'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  // Join all conversation rooms
  socket.on('join', (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach(id => socket.join(id))
    }
  })

  socket.on('join_conv', (id) => socket.join(id))

  socket.on('disconnect', () => {})
})

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000

initDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
}).catch(err => {
  console.error('DB init failed:', err)
  process.exit(1)
})
