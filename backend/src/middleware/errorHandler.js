function errorHandler(err, req, res, next) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
