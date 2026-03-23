const { Router } = require('express');
const urlsRouter = require('./api/urls');
const statsRouter = require('./api/stats');
const redirectRouter = require('./redirect');

const router = Router();

router.use('/api/urls', urlsRouter);
router.use('/api/stats', statsRouter);
router.use('/', redirectRouter);

module.exports = router;
