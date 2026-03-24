const { Router } = require('express');
const { dashboard, urlStats } = require('../../controllers/statsController');

const router = Router();

router.get('/dashboard', dashboard);
router.get('/url/:id', urlStats);

module.exports = router;
