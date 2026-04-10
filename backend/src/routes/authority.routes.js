// ============================================================
// Authority Routes — Phase 2
// Modules: 10 (Escalation), 13 (Authority Mapping),
//          14 (Routing), 17 (Road Health)
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboard, listComplaints, assignComplaint, escalateComplaint,
  getAuthorityAreas, getRoadHealth, recomputeRoadHealth,
} = require('../controllers/authority.controller');

// All routes require authenticated authority or admin
const authorityOnly = [authenticate, authorize('authority', 'admin')];

router.get('/dashboard',                authorityOnly, getDashboard);
router.get('/complaints',               authorityOnly, listComplaints);
router.patch('/complaints/:id/assign',  authorityOnly, assignComplaint);
router.post('/complaints/:id/escalate', authorityOnly, escalateComplaint);
router.get('/areas',                    authorityOnly, getAuthorityAreas);
router.get('/road-health',              authorityOnly, getRoadHealth);
router.post('/road-health/recompute',   authorityOnly, recomputeRoadHealth);

module.exports = router;
