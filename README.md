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
- **Security** — URL validation (http/https only), alphanumeric-only codes, parameterized SQL queries

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Vite (served by Nginx) |
| Database | SQLite via `better-sqlite3` |
| Cache | Redis (15-min TTL) |
| Container | Docker + Docker Compose |

## Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd url-shortener

# 2. Create data directories
mkdir -p data/sqlite data/redis

# 3. Configure environment (optional)
cp .env.example .env
# Edit .env — set HASHIDS_SALT to a random secret string

# 4. Build and start
docker compose up --build -d

# 5. Open the backstage
open http://localhost/admin
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost` | Public base URL for short links |
| `HASHIDS_SALT` | `change-me-in-production` | **Change this!** Salt for code generation |

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
