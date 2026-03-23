const { Router } = require('express');
const { redirect } = require('../controllers/redirectController');

const router = Router();

// Only match alphanumeric codes; avoids catching /api, /admin, etc.
router.get('/:code([0-9a-zA-Z]+)', redirect);

module.exports = router;
