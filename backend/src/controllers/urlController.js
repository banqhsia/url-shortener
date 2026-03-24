const urlService = require('../services/urlService');
const { isValidUrl, isValidCode } = require('../middleware/validate');
const { checkAndUpdateUrl } = require('../services/healthCheckService');

function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const q = (req.query.q || '').trim();
  const sort_by = (req.query.sort_by || 'created_at').trim();
  const sort_dir = (req.query.sort_dir || 'desc').trim();

  const result = urlService.getUrls({ page, limit, q, sort_by, sort_dir });
  res.json(result);
}

function getOne(req, res) {
  const record = urlService.getUrlById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
}

async function create(req, res, next) {
  try {
    const { original_url, code, expires_at } = req.body;

    if (!isValidUrl(original_url)) {
      return res.status(400).json({ error: 'original_url must be a valid http or https URL' });
    }
    if (code && !isValidCode(code)) {
      return res.status(400).json({ error: 'code must be 1–100 alphanumeric characters' });
    }
    if (expires_at !== undefined && expires_at !== null) {
      const ts = Number(expires_at);
      if (!Number.isInteger(ts) || ts <= 0) {
        return res.status(400).json({ error: 'expires_at must be a positive Unix timestamp (seconds)' });
      }
    }

    const expiresAtValue = (expires_at !== undefined && expires_at !== null) ? Number(expires_at) : null;
    const record = urlService.createUrl(original_url, code || null, expiresAtValue);
    checkAndUpdateUrl(record.id).catch(() => {});
    res.status(201).json(record);
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

async function bulkCreate(req, res, next) {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls must be a non-empty array' });
    }

    // Filter out invalid URLs before passing to service
    const valid = [];
    const errors = [];
    for (const url of urls) {
      if (isValidUrl(url)) {
        valid.push(url);
      } else {
        errors.push({ url, error: 'Invalid URL — must be http or https' });
      }
    }

    const result = urlService.bulkCreateUrls(valid);
    res.status(201).json({
      results: result.results,
      errors: [...errors, ...result.errors],
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { code, original_url, click_count, expires_at } = req.body;

    if (original_url !== undefined && !isValidUrl(original_url)) {
      return res.status(400).json({ error: 'original_url must be a valid http or https URL' });
    }
    if (code !== undefined && !isValidCode(code)) {
      return res.status(400).json({ error: 'code must be 1–100 alphanumeric characters' });
    }
    if (expires_at !== undefined && expires_at !== null) {
      const ts = Number(expires_at);
      if (!Number.isInteger(ts) || ts <= 0) {
        return res.status(400).json({ error: 'expires_at must be a positive Unix timestamp (seconds)' });
      }
    }

    const expiresAtValue = expires_at !== undefined ? (expires_at === null ? null : Number(expires_at)) : undefined;
    const record = await urlService.updateUrl(req.params.id, { code, original_url, click_count, expires_at: expiresAtValue });
    if (!record) return res.status(404).json({ error: 'Not found' });
    checkAndUpdateUrl(record.id).catch(() => {});
    res.json(record);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Code already in use' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await urlService.deleteUrl(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function exportCsv(req, res) {
  const { getDb } = require('../config/db');
  const db = getDb();
  const rows = db.prepare('SELECT id, code, original_url, click_count, expires_at, created_at FROM urls ORDER BY created_at DESC').all();

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    'id,code,original_url,click_count,expires_at,created_at',
    ...rows.map(r => [
      r.id,
      escape(r.code),
      escape(r.original_url),
      r.click_count,
      r.expires_at || '',
      r.created_at,
    ].join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="urls.csv"');
  res.send(lines.join('\r\n'));
}

module.exports = { list, getOne, create, bulkCreate, update, remove, exportCsv };
