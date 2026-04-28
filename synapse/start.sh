#!/bin/bash
set -e

DATA_DIR="/data"
CONFIG_FILE="$DATA_DIR/homeserver.yaml"
LOG_CONFIG="$DATA_DIR/log.config"
PORT="${PORT:-8008}"

echo "==> Starting Matrix Synapse on port $PORT"
echo "==> Server name: $SYNAPSE_SERVER_NAME"

# ── Write log config ──────────────────────────────────────────────────────────
cat > "$LOG_CONFIG" <<'EOF'
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
loggers:
  synapse.storage.SQL:
    level: WARNING
root:
  level: INFO
  handlers: [console]
disable_existing_loggers: false
EOF

# ── Build email section (only if SMTP is configured) ─────────────────────────
EMAIL_SECTION=""
if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ]; then
  EMAIL_SECTION="
email:
  smtp_host: ${SMTP_HOST}
  smtp_port: ${SMTP_PORT:-587}
  smtp_user: ${SMTP_USER}
  smtp_pass: ${SMTP_PASSWORD}
  notif_from: 'Matrix Messenger <${SMTP_FROM:-$SMTP_USER}>'
  enable_tls: true

registrations_require_3pid:
  - email

allowed_local_3pids:
  - medium: email
    pattern: '.*'
"
fi

# ── Write homeserver.yaml ─────────────────────────────────────────────────────
cat > "$CONFIG_FILE" <<EOF
server_name: "${SYNAPSE_SERVER_NAME}"
public_baseurl: "${SYNAPSE_PUBLIC_BASEURL}"
pid_file: /tmp/homeserver.pid

listeners:
  - port: ${PORT}
    tls: false
    type: http
    bind_addresses: ['0.0.0.0', '::']
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

database:
  name: psycopg2
  args:
    user: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
    database: ${POSTGRES_DB}
    host: ${POSTGRES_HOST}
    port: ${POSTGRES_PORT}
    cp_min: 5
    cp_max: 10

log_config: "${LOG_CONFIG}"
media_store_path: "${DATA_DIR}/media_store"
signing_key_path: "${DATA_DIR}/signing.key"

registration_shared_secret: "${SYNAPSE_REGISTRATION_SHARED_SECRET}"
macaroon_secret_key: "${SYNAPSE_MACAROON_SECRET_KEY}"
form_secret: "${SYNAPSE_FORM_SECRET}"

# Enable open registration (disable in production or protect with shared secret)
enable_registration: true
enable_registration_without_verification: true

# User directory — allows searching users by username/display name
user_directory:
  enabled: true
  search_all_users: true

# Retention
max_upload_size: 50M

suppress_key_server_warning: true
report_stats: false

${EMAIL_SECTION}
EOF

echo "==> Config written."

# ── Generate signing key if missing ──────────────────────────────────────────
if [ ! -f "$DATA_DIR/signing.key" ]; then
  echo "==> Generating signing key..."
  python -m synapse.app.homeserver \
    --config-path "$CONFIG_FILE" \
    --generate-keys
fi

echo "==> Launching Synapse..."
exec python -m synapse.app.homeserver \
  --config-path "$CONFIG_FILE"
