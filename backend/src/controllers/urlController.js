const urlService = require('../services/urlService');

function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 25);
  const q = (req.query.q || '').trim();

  const result = urlService.getUrls({ page, limit, q });
  res.json(result);
}

function getOne(req, res) {
  const record = urlService.getUrlById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
}

async function create(req, res, next) {
  try {
    const { original_url, code } = req.body;
    if (!original_url) return res.status(400).json({ error: 'original_url is required' });

    const record = urlService.createUrl(original_url, code || null);
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

    const result = urlService.bulkCreateUrls(urls);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { code, original_url, click_count } = req.body;
    const record = await urlService.updateUrl(req.params.id, { code, original_url, click_count });
    if (!record) return res.status(404).json({ error: 'Not found' });
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

module.exports = { list, getOne, create, bulkCreate, update, remove };
