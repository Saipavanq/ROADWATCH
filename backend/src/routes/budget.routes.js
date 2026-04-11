const express = require('express');
const router = express.Router();
const budgetCtrl = require('../controllers/budget.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('authority', 'admin'), budgetCtrl.getBudgets);
router.post('/allocate', authenticate, authorize('authority', 'admin'), budgetCtrl.allocateFunds);

module.exports = router;
