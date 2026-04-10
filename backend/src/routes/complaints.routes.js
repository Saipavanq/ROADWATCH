// ============================================================
// Complaints Routes
// ============================================================
const express  = require('express');
const router   = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const {
  createComplaint, listComplaints, getComplaint,
  updateStatus, upvote, getStats,
} = require('../controllers/complaints.controller');

// Public
router.get('/stats',       getStats);
router.get('/',            optionalAuth, listComplaints);
router.get('/:id',         optionalAuth, getComplaint);

// Authenticated
router.post('/', optionalAuth, upload.array('images', 5), createComplaint);
router.post('/:id/upvote', authenticate, upvote);

// Authority/Admin only
router.patch('/:id/status', authenticate, authorize('authority', 'admin'), updateStatus);

module.exports = router;
