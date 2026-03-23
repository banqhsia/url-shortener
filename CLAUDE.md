# CLAUDE.md — Codebase Guide

## Architecture

```
Browser → Nginx (port 80)
             ├─ /admin*   → React SPA (static files in /usr/share/nginx/html)
             ├─ /api/*    → backend:3000 (Express)
             └─ /*        → backend:3000 (short-code redirect handler)

backend:3000
  ├─ GET /:code       → Redis read-through → SQLite → 302 redirect
  ├─ /api/urls        → CRUD + bulk create
  └─ /api/stats       → UTC+8 dashboard stats

Redis  → cache key: url:code:<code>  TTL: 900s
SQLite → urls table + click_events table (for time-series stats)
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Entry point — loads dotenv, runs migrations, starts Express |
| `backend/src/app.js` | Express setup — cors, json, routes, error handler |
| `backend/src/utils/hashids.js` | Code generation — encodes SQLite auto-increment ID with hashids |
| `backend/src/services/urlService.js` | Core business logic — createUrl, bulkCreateUrls, updateUrl, deleteUrl |
| `backend/src/services/cacheService.js` | Redis wrappers — getCachedUrl, setCachedUrl, deleteCachedUrl |
| `backend/src/controllers/redirectController.js` | Read-through cache + async click increment |
| `backend/src/controllers/statsController.js` | UTC+8 today-boundary calculation for dashboard |
| `backend/src/middleware/validate.js` | isValidUrl (http/https only) + isValidCode (alphanumeric) |
| `backend/src/views/404.html` | Served when a short code isn't found |
| `backend/src/db/migrations/001_init.sql` | Schema — urls + click_events tables |
| `frontend/nginx.conf` | Nginx routing — `^~ /admin` → @spa named location, `/api/` → proxy, `/` → proxy |
| `docker-compose.yml` | Three services: redis (healthcheck) → backend → frontend |

## Code Generation

`hashids` package encodes the SQLite `AUTOINCREMENT` row ID with a secret salt.
`minLength: 8` → codes are always 8+ chars, alphanumeric.
Same ID + same salt = same code, so no collision is possible.
Salt is set via `HASHIDS_SALT` env var.

## Database

Two tables:
- `urls` — stores records; `click_count` is a denormalized counter for fast list queries
- `click_events` — raw click timestamp log used for the UTC+8 "today" dashboard query

**UTC+8 boundary calculation** (in `statsController.js`):
```js
const utc8Now = Date.now() + 8 * 3600 * 1000;
const startOfDayUTC8 = utc8Now - (utc8Now % 86400000);
const startOfDayUTC = startOfDayUTC8 - 8 * 3600 * 1000;
```

## Security

- **SQL injection**: prevented by parameterized queries (`db.prepare().run(params)`) throughout
- **Code parameter**: Express route regex `/:code([0-9a-zA-Z]+)` rejects any non-alphanumeric char before reaching the controller — SQL injection strings never arrive
- **URL validation**: `isValidUrl()` in `validate.js` accepts only `http:` and `https:` protocols; rejects `javascript:`, `data:`, `file:`, etc.
- **Code validation**: `isValidCode()` enforces `/^[0-9a-zA-Z]{1,100}$/` on API inputs

## Cache Invalidation

| Event | Action |
|-------|--------|
| Redirect hit (miss) | SET `url:code:<code>` with 900s TTL |
| PUT /api/urls/:id | DEL old code key, SET new code key |
| DELETE /api/urls/:id | DEL code key |

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
/admin           → Dashboard (stats, auto-refresh 60s)
/admin/urls      → URL list (25/page, search, delete)
/admin/urls/new  → Create single URL
/admin/urls/bulk → Bulk create (textarea)
/admin/urls/:id/edit → Edit URL record
```
