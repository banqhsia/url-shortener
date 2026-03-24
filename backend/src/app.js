const express = require('express');
const session = require('express-session');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { SESSION_SECRET } = require('./config/env');
const router = require('./routes');
const requireAuth = require('./middleware/requireAuth');
const { errorHandler } = require('./middleware/errorHandler');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
  skip: () => process.env.NODE_ENV === 'test',
});

const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
  skip: () => process.env.NODE_ENV === 'test',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
  skip: () => process.env.NODE_ENV === 'test',
});

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

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api', apiLimiter, requireAuth);

app.use(redirectLimiter, router);
app.use(errorHandler);

module.exports = app;
