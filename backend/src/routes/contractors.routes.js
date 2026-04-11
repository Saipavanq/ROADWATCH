const express = require('express');
const router = express.Router();
const contractorsCtrl = require('../controllers/contractors.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('authority', 'admin'), contractorsCtrl.getContractors);
router.post('/assign', authenticate, authorize('authority', 'admin'), contractorsCtrl.assignComplaint);

module.exports = router;
