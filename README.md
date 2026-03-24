# URL Shortener

A self-hosted URL shortener with a management backstage, built with Node.js, SQLite, and Redis. Fully Dockerized.

## Features

- **Short links** — `<domain>/<code>` with hashids-based code generation (no collision possible)
- **Redis cache** — recently visited links cached for 15 minutes
- **URL expiry** — set an optional expiration date; expired links return HTTP 410 Gone
- **Management backstage** at `/admin`
  - Statistics dashboard — today's total clicks + top clicked links (UTC+8)
  - Paginated URL list (25/page) with search and sortable columns
  - Create, edit, and delete individual links
  - Bulk creation via textarea (one URL per line)
  - Per-URL analytics — daily click chart (7d/30d), device breakdown, top referrers
  - QR code generation and PNG download on the edit page
  - CSV export of all URLs
- **Click source tracking** — records referrer and device type (mobile / bot / desktop) per click
- **URL health checks** — background job checks each link every 10 minutes; status shown in the list
- **Authentication** — password-protected admin panel; 6-hour sessions stored in Redis
- **Rate limiting** — protects login (10/15 min), redirects (120/60 s), and API (300/60 s)
- **Security** — URL validation (http/https only), alphanumeric-only codes, parameterized SQL queries, timing-safe password comparison

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Vite (served by Nginx) |
| Database | SQLite via `better-sqlite3` |
| Cache / Sessions | Redis (15-min URL TTL, 6-hour session TTL) |
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
             →  410 Gone if the link has expired
             →  404 if the code doesn't exist
```

### API

All endpoints under `/api/` require authentication (session cookie from `POST /api/auth/login`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login (`{ "password": "..." }`) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Check session |
| `GET` | `/api/urls` | List URLs (`?page&limit&q&sort_by&sort_dir`) |
| `POST` | `/api/urls` | Create one (`{ "original_url", "code"?, "expires_at"? }`) |
| `POST` | `/api/urls/bulk` | Bulk create (`{ "urls": ["https://...", ...] }`) |
| `GET` | `/api/urls/export` | Download all as CSV |
| `GET` | `/api/urls/:id` | Get single record |
| `PUT` | `/api/urls/:id` | Update record |
| `DELETE` | `/api/urls/:id` | Delete record |
| `GET` | `/api/stats/dashboard` | Today's stats (UTC+8) |
| `GET` | `/api/stats/url/:id` | Per-URL analytics (`?period=7d\|30d`) |

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
│       ├── db/migrations/  # incremental SQL migrations
│       ├── middleware/
│       ├── routes/
│       ├── services/ # urlService, cacheService, healthChecker
│       ├── utils/    # hashids wrapper
│       └── views/    # 404.html
└── frontend/         # React SPA (Nginx)
    └── src/
        ├── components/
        └── pages/
```
