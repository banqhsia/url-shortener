const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const cors = require('cors');
const redis = require('./config/redis');
const { SESSION_SECRET } = require('./config/env');
const router = require('./routes');
const requireAuth = require('./middleware/requireAuth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.use(session({
  store: new RedisStore({ client: redis, prefix: 'sess:', ttl: 21600 }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 6 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', require('./routes/api/auth'));
app.use('/api', requireAuth);

app.use(router);
app.use(errorHandler);

module.exports = app;
