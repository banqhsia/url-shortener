# URL Shortener

A self-hosted URL shortener with a management backstage, built with Node.js, SQLite, and Redis. Fully Dockerized.

## Features

- **Short links** — `<domain>/<code>` with hashids-based code generation (no collision possible)
- **Redis cache** — recently visited links cached for 15 minutes
- **Management backstage** at `/admin`
  - Statistics dashboard — most clicked links today (UTC+8)
  - Paginated URL list (25/page) with search by code or URL
  - Create, edit, and delete individual links
  - Bulk creation via textarea (one URL per line)
- **Authentication** — password-protected admin panel; 6-hour sessions stored in Redis
- **Security** — URL validation (http/https only), alphanumeric-only codes, parameterized SQL queries

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Vite (served by Nginx) |
| Database | SQLite via `better-sqlite3` |
| Cache | Redis (15-min TTL) |
| Container | Docker + Docker Compose |

## Deployment

### Prerequisites

- Docker and Docker Compose installed on the server
- A domain or IP pointing to your server (optional but recommended)

### First-time setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd url-shortener

# 2. Create data directories
mkdir -p data/sqlite data/redis

# 3. Copy the example env file and fill in your values
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Public URL for short links (no trailing slash)
BASE_URL=https://your-domain.com

# Random salt for short code generation — change this!
HASHIDS_SALT=<any random string>

# Session signing secret — generate with: openssl rand -hex 32
SESSION_SECRET=<output of openssl rand -hex 32>

# Admin panel password
ADMIN_PASSWORD=<your-chosen-password>
```

```bash
# 4. Build and start
docker compose up --build -d

# 5. Open the admin panel
open http://localhost/admin
# Log in with the password set in ADMIN_PASSWORD
```

> **Security note:** `.env` is gitignored and never committed. Keep it safe on your server. Do not share `SESSION_SECRET` or `ADMIN_PASSWORD`.

### Changing the password

Update `ADMIN_PASSWORD` in `.env`, then restart the backend:

```bash
docker compose up -d backend
```

Active sessions remain valid until they expire (6 hours). Users must log in again after expiry.

### HTTPS

It is strongly recommended to run behind a reverse proxy (e.g. Nginx, Caddy) that terminates TLS. Once HTTPS is in place:

1. Set `BASE_URL=https://your-domain.com` in `.env`
2. Set `COOKIE_SECURE=true` in `.env` — this marks the session cookie as HTTPS-only

### Routine operations

```bash
docker compose up -d          # start all services
docker compose down           # stop all services
docker compose logs -f        # stream all logs
docker compose logs backend   # backend logs only
docker compose exec redis redis-cli  # Redis CLI
docker compose pull && docker compose up --build -d  # update & rebuild
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost` | Public base URL for short links |
| `HASHIDS_SALT` | `change-me-in-production` | **Change this!** Salt for code generation |
| `SESSION_SECRET` | *(required)* | Secret for signing session cookies |
| `ADMIN_PASSWORD` | *(required)* | Password for the admin panel |
| `COOKIE_SECURE` | `false` | Set to `true` when serving over HTTPS |

## Usage

### Redirect

```
GET /<code>  →  302 redirect to original URL
```

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/urls` | List URLs (`?page=1&limit=25&q=search`) |
| `POST` | `/api/urls` | Create one (`{ "original_url": "...", "code": "optional" }`) |
| `POST` | `/api/urls/bulk` | Bulk create (`{ "urls": ["https://...", ...] }`) |
| `GET` | `/api/urls/:id` | Get single record |
| `PUT` | `/api/urls/:id` | Update record |
| `DELETE` | `/api/urls/:id` | Delete record |
| `GET` | `/api/stats/dashboard` | Today's stats (UTC+8) |

### Docker commands

```bash
docker compose up -d          # start
docker compose down           # stop
docker compose logs -f        # stream logs
docker compose logs backend   # backend logs only
docker compose exec redis redis-cli  # Redis CLI
```

## Project Structure

```
url-shortener/
├── backend/          # Express API + redirect handler
│   └── src/
│       ├── config/   # db, redis, env
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── utils/    # hashids wrapper
│       └── views/    # 404.html
└── frontend/         # React SPA (Nginx)
    └── src/
        ├── components/
        └── pages/
```
