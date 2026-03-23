/**
 * Input validation helpers.
 *
 * Security notes:
 *  - The redirect route already guards via Express regex /:code([0-9a-zA-Z]+),
 *    so only alphanumeric chars reach the redirect controller.
 *  - All DB operations use better-sqlite3 parameterized statements,
 *    making SQL injection impossible regardless of input content.
 *  - These validators add a second layer at the API boundary.
 */

const CODE_RE = /^[0-9a-zA-Z]{1,100}$/;
const MAX_URL_LENGTH = 2048;

function isValidUrl(str) {
  if (!str || typeof str !== 'string' || str.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidCode(str) {
  return typeof str === 'string' && CODE_RE.test(str);
}

module.exports = { isValidUrl, isValidCode };
