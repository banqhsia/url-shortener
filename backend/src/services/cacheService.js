const redis = require('../config/redis');

const TTL = 900; // 15 minutes

async function getCachedUrl(code) {
  const data = await redis.get(`url:code:${code}`);
  return data ? JSON.parse(data) : null;
}

async function setCachedUrl(code, record) {
  await redis.set(`url:code:${code}`, JSON.stringify(record), 'EX', TTL);
}

async function deleteCachedUrl(code) {
  await redis.del(`url:code:${code}`);
}

module.exports = { getCachedUrl, setCachedUrl, deleteCachedUrl };
