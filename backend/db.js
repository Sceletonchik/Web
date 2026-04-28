const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username    VARCHAR(64) UNIQUE NOT NULL,
      display_name VARCHAR(128) NOT NULL,
      email       VARCHAR(256) UNIQUE NOT NULL,
      password    VARCHAR(256) NOT NULL,
      avatar_url  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      type            VARCHAR(16) NOT NULL DEFAULT 'text',
      body            TEXT,
      file_url        TEXT,
      file_name       TEXT,
      file_size       BIGINT,
      file_mime       TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS read_receipts (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
      last_read_msg   UUID REFERENCES messages(id) ON DELETE SET NULL,
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `)
  console.log('✅ Database ready')
}

module.exports = { pool, initDB }
