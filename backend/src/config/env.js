require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DB_PATH: process.env.DB_PATH || './data/urls.db',
  BASE_URL: process.env.BASE_URL || 'http://localhost',
  HASHIDS_SALT: process.env.HASHIDS_SALT || 'change-me-in-production',
};
