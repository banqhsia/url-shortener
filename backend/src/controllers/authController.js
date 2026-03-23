const crypto = require('crypto');
const { ADMIN_PASSWORD } = require('../config/env');

function login(req, res) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const expected = Buffer.from(ADMIN_PASSWORD);
  const provided = Buffer.from(password);

  const valid =
    expected.length > 0 &&
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    req.session.authenticated = true;
    req.session.save((err2) => {
      if (err2) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true });
    });
  });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
}

function me(req, res) {
  if (req.session.authenticated) {
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false });
}

module.exports = { login, logout, me };
