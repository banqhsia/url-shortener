// Set env vars BEFORE any module is loaded
process.env.NODE_ENV = 'test';
process.env.DB_PATH = '/tmp/url-shortener-test.db';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ADMIN_PASSWORD = 'testpassword';
process.env.HASHIDS_SALT = 'test-salt';
process.env.BASE_URL = 'http://localhost';
process.env.COOKIE_SECURE = 'false';
