const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { SESSION_SECRET } = require('./config/env');
const router = require('./routes');
const requireAuth = require('./middleware/requireAuth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 6 * 60 * 60 * 1000,
  },
};

if (process.env.NODE_ENV !== 'test') {
  const RedisStore = require('connect-redis').default;
  const redis = require('./config/redis');
  sessionConfig.store = new RedisStore({ client: redis, prefix: 'sess:', ttl: 21600 });
}

app.use(session(sessionConfig));

app.use('/api/auth', require('./routes/api/auth'));
app.use('/api', requireAuth);

app.use(router);
app.use(errorHandler);

module.exports = app;
