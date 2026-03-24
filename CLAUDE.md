# CLAUDE.md — Codebase Guide

## Architecture

```
Browser → Nginx (port 80)
             ├─ /admin*   → React SPA (static files in /usr/share/nginx/html)
             ├─ /api/*    → backend:3000 (Express)
             └─ /*        → backend:3000 (short-code redirect handler)

backend:3000
  ├─ GET /:code       → Redis read-through → SQLite → 302 redirect (410 if expired)
  ├─ /api/auth        → login, logout, session check
  ├─ /api/urls        → CRUD + bulk create + CSV export
  └─ /api/stats       → UTC+8 dashboard stats + per-URL analytics

Redis  → cache key: url:code:<code>  TTL: 900s
       → session store key: sess:<sid>  TTL: 6h
SQLite → urls table + click_events table (rich click metadata)
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Entry point — loads dotenv, runs migrations, starts Express, schedules health checker |
| `backend/src/app.js` | Express setup — session, rate limiting, cors, json, routes, error handler |
| `backend/src/utils/hashids.js` | Code generation — encodes SQLite auto-increment ID with hashids |
| `backend/src/services/urlService.js` | Core business logic — createUrl, bulkCreateUrls, updateUrl, deleteUrl |
| `backend/src/services/cacheService.js` | Redis wrappers — getCachedUrl, setCachedUrl, deleteCachedUrl |
| `backend/src/services/healthChecker.js` | Background health check — HEAD requests every 10 min, batch 20 |
| `backend/src/controllers/redirectController.js` | Read-through cache + expiry check + async click logging (referrer + device) |
| `backend/src/controllers/statsController.js` | UTC+8 today-boundary calculation for dashboard + per-URL analytics |
| `backend/src/controllers/authController.js` | Login (timing-safe compare), logout, session check |
| `backend/src/middleware/validate.js` | isValidUrl (http/https only, max 2048 chars) + isValidCode (alphanumeric) |
| `backend/src/middleware/auth.js` | requireAuth middleware — rejects unauthenticated API requests |
| `backend/src/views/404.html` | Served when a short code isn't found |
| `backend/src/db/migrations/` | 4 incremental migrations (schema + features) |
| `frontend/nginx.conf` | Nginx routing — `^~ /admin` → @spa named location, `/api/` → proxy, `/` → proxy |
| `docker-compose.yml` | Three services: redis (healthcheck) → backend → frontend |

## Code Generation

`hashids` package encodes the SQLite `AUTOINCREMENT` row ID with a secret salt.
`minLength: 8` → codes are always 8+ chars, alphanumeric.
Same ID + same salt = same code, so no collision is possible.
Salt is set via `HASHIDS_SALT` env var.

## Database

**urls table:**
- `id`, `code` (UNIQUE), `original_url`, `click_count` (denormalized counter)
- `created_at`, `updated_at` (Unix seconds)
- `expires_at` (Unix seconds, nullable) — redirect returns 410 Gone if expired
- `is_alive` (0/1, nullable), `last_checked_at` (Unix seconds, nullable) — health check results

**click_events table:**
- `id`, `url_id` (FK → urls, CASCADE), `clicked_at` (Unix seconds)
- `referrer` (TEXT, nullable) — from HTTP `referer` header
- `device_type` (TEXT, nullable) — `mobile` | `bot` | `desktop` | `unknown`

**Indices:** `idx_urls_code`, `idx_click_events_url_id`, `idx_click_events_clicked_at`

**UTC+8 boundary calculation** (in `statsController.js`):
```js
const utc8Now = Date.now() + 8 * 3600 * 1000;
const startOfDayUTC8 = utc8Now - (utc8Now % 86400000);
const startOfDayUTC = startOfDayUTC8 - 8 * 3600 * 1000;
```

## API Endpoints

**Auth** (no auth required):
- `POST /api/auth/login` — password login, sets session cookie
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — check auth status

**URLs** (auth required):
- `GET /api/urls` — list with pagination, search (`q`), sort (`sort_by`, `sort_dir`)
- `POST /api/urls` — create one (`original_url`, optional `code`, optional `expires_at`)
- `POST /api/urls/bulk` — bulk create (`{ urls: [...] }`)
- `GET /api/urls/export` — download all as CSV
- `GET /api/urls/:id` — get single record
- `PUT /api/urls/:id` — update (handles cache invalidation + instant health check)
- `DELETE /api/urls/:id` — delete

**Stats** (auth required):
- `GET /api/stats/dashboard` — today's total clicks + top 10 URLs (UTC+8)
- `GET /api/stats/url/:id?period=7d|30d` — daily chart, device breakdown, top referrers

**Redirect** (no auth, rate limited):
- `GET /:code([0-9a-zA-Z]+)` — 302 redirect, 410 if expired, 404 if not found; logs referrer + device

## Security

- **SQL injection**: parameterized queries (`db.prepare().run(params)`) throughout
- **Code parameter**: Express route regex `/:code([0-9a-zA-Z]+)` rejects non-alphanumeric before controller
- **URL validation**: `isValidUrl()` accepts only `http:` / `https:`; max 2048 chars
- **Code validation**: `isValidCode()` enforces `/^[0-9a-zA-Z]{1,100}$/`
- **Password check**: `crypto.timingSafeEqual()` (constant-time comparison)
- **Session**: HttpOnly, SameSite=lax, 6h TTL, regenerated on login; `COOKIE_SECURE=true` for HTTPS
- **Rate limits**: login 10/15min, redirect 120/60s, API 300/60s (disabled when `NODE_ENV=test`)

## Cache Invalidation

| Event | Action |
|-------|--------|
| Redirect hit (miss) | SET `url:code:<code>` with 900s TTL |
| PUT /api/urls/:id | DEL old code key, DEL new code key, SET new code key |
| DELETE /api/urls/:id | DEL code key |

## Health Checker

Background job in `healthChecker.js`, scheduled every 10 minutes (first run after 30s delay):
- Sends HEAD request to each URL (timeout 8s), batch size 20
- Updates `is_alive` and `last_checked_at` on the `urls` record
- `checkAndUpdateUrl(id)` is also called immediately on create/edit for instant feedback

## Click Source Tracking

`redirectController.js` captures on each redirect:
- `referrer` — raw value of HTTP `referer` header (note: intentional HTTP misspelling)
- `device_type` — parsed from `user-agent`:
  - `mobile` — iOS, Android, BlackBerry, Opera Mini, IEMobile
  - `bot` — Googlebot, Bingbot, and other crawler patterns
  - `desktop` — all other recognized browsers
  - `unknown` — UA header missing

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Backend server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `DB_PATH` | `./data/urls.db` | SQLite database path |
| `BASE_URL` | `http://localhost` | Public base URL for short links |
| `HASHIDS_SALT` | `change-me-in-production` | Salt for hashids code generation |
| `SESSION_SECRET` | *(required)* | Session signing secret |
| `ADMIN_PASSWORD` | *(required)* | Admin panel password |
| `COOKIE_SECURE` | `false` | Set `true` for HTTPS (marks cookies secure) |
| `NODE_ENV` | *(unset)* | Set to `test` to skip rate limiting and Redis store |

## Common Commands

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code change
docker compose build backend && docker compose up -d backend

# Check Redis cache
docker compose exec redis redis-cli get url:code:<code>

# SQLite shell
docker compose exec backend sh -c 'sqlite3 /data/sqlite/urls.db ".tables"'

# Reset everything (data included)
docker compose down && rm -rf data/
```

## Frontend Routes

```
/admin                  → Dashboard (today's stats, auto-refresh 60s)
/admin/urls             → URL list (25/page, search, sort, Export CSV button)
/admin/urls/new         → Create single URL (with optional code + expiry)
/admin/urls/bulk        → Bulk create (textarea, one URL per line)
/admin/urls/:id/edit    → Edit URL (code, target, click count, expiry, QR code download)
/admin/urls/:id/stats   → Per-URL analytics (daily chart 7d/30d, devices, top referrers)
/admin/login            → Login page
```
