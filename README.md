# Matrix Messenger

A full-featured Matrix-based messenger. Telegram-style UX: @username search, file sharing, read receipts (double ticks), DM rooms.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Matrix Synapse (Docker) |
| Database | PostgreSQL (Render managed) |
| Frontend | React + Vite + Tailwind CSS |
| Hosting | Render (render.yaml) |

---

## Deploy to Render — Step by Step

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create matrix-messenger --public --push
# or: git remote add origin <your-repo-url> && git push -u origin main
```

### 2. Create Render Blueprint

1. Go to https://render.com → **New → Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` and create:
   - `synapse` — Docker web service
   - `messenger-frontend` — Static site
   - `synapse-db` — PostgreSQL database

### 3. Set Required Environment Variables

After blueprint is created, open the **synapse** service → **Environment**:

| Variable | Value |
|---|---|
| `SYNAPSE_SERVER_NAME` | Your synapse URL **without** `https://` e.g. `synapse.onrender.com` |
| `SYNAPSE_PUBLIC_BASEURL` | Full URL e.g. `https://synapse.onrender.com` |

> The database variables are auto-filled from the managed DB.

### 4. Set Frontend Variable

Open **messenger-frontend** → **Environment**:

| Variable | Value |
|---|---|
| `VITE_MATRIX_HOMESERVER` | `https://synapse.onrender.com` |

### 5. Deploy

Click **Manual Deploy** on both services (or push a commit). Synapse takes ~2 min on first boot (generates keys).

### 6. Test

Open your frontend URL → Register with any `@username` → Start chatting!

---

## Optional: Enable Email Verification

Set these on the `synapse` service:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=you@gmail.com
```

Then in `synapse/start.sh` remove or comment out:
```yaml
enable_registration_without_verification: true
```

---

## Local Development

### Run Synapse locally (Docker)

```bash
docker build -t synapse ./synapse
docker run -p 8008:8008 \
  -e SYNAPSE_SERVER_NAME=localhost \
  -e SYNAPSE_PUBLIC_BASEURL=http://localhost:8008 \
  -e POSTGRES_USER=synapse \
  -e POSTGRES_PASSWORD=synapse \
  -e POSTGRES_DB=synapse \
  -e POSTGRES_HOST=host.docker.internal \
  -e POSTGRES_PORT=5432 \
  -e SYNAPSE_REGISTRATION_SHARED_SECRET=devsecret \
  -e SYNAPSE_MACAROON_SECRET_KEY=devmacaroon \
  -e SYNAPSE_FORM_SECRET=devform \
  -v synapse-data:/data \
  synapse
```

### Run Frontend

```bash
cd frontend
cp .env .env        # set VITE_MATRIX_HOMESERVER=http://localhost:8008
npm install
npm run dev
```

`.env.example`:
```
VITE_MATRIX_HOMESERVER=http://localhost:8008
```

---

## Features

- ✅ Register / Login with `@username`
- ✅ Search users by username or display name
- ✅ One-to-one DM rooms (auto-created)
- ✅ Send text messages (Enter to send, Shift+Enter for newline)
- ✅ Send files: images (preview), video, audio, documents
- ✅ Drag & drop file upload
- ✅ Read receipts — Telegram-style double blue ticks ✓✓
- ✅ Unread badge on sidebar
- ✅ Long-polling sync (real-time updates)
- ✅ Persistent session (localStorage)
- ✅ Colour avatars with initials fallback

---

## Notes

- Render free tier spins down after inactivity — first load may be slow.  
  Upgrade to **Starter** plan to keep services always on.
- Media files are stored on Synapse's persistent disk (10 GB included).
- The `user_directory.search_all_users: true` setting lets users find each other even if they have no common rooms.
