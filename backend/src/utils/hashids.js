const Hashids = require('hashids');
const { HASHIDS_SALT } = require('../config/env');

// minLength 8 produces codes 8–10+ chars, deterministic from the integer ID
const hashids = new Hashids(HASHIDS_SALT, 8);

function encode(id) {
  return hashids.encode(id);
}

function decode(code) {
  const result = hashids.decode(code);
  return result.length > 0 ? result[0] : null;
}

module.exports = { encode, decode };
