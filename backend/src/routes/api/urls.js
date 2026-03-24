const { Router } = require('express');
const ctrl = require('../../controllers/urlController');

const router = Router();

// /bulk and /export must come before /:id to avoid route shadowing
router.post('/bulk', ctrl.bulkCreate);
router.get('/export', ctrl.exportCsv);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
