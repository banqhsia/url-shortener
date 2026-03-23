const { Router } = require('express');
const { dashboard } = require('../../controllers/statsController');

const router = Router();

router.get('/dashboard', dashboard);

module.exports = router;
