const redis = require('../config/redis');

const TTL = 900; // 15 minutes
const urlKey = (code) => `url:code:${code}`;

async function getCachedUrl(code) {
  const data = await redis.get(urlKey(code));
  return data ? JSON.parse(data) : null;
}

async function setCachedUrl(code, record) {
  await redis.set(urlKey(code), JSON.stringify(record), 'EX', TTL);
}

async function deleteCachedUrl(code) {
  await redis.del(urlKey(code));
}

module.exports = { getCachedUrl, setCachedUrl, deleteCachedUrl };
