// ============================================================
// Roads Routes — Modules 12 (Road Mapping) & 17 (Health)
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  listRoads, getRoad, createRoad, updateRoad,
  getRoadHealth, recomputeRoadHealth,
} = require('../controllers/roads.controller');

const authorityAuth = [authenticate, authorize('authority', 'admin')];

// Public read access
router.get('/',          listRoads);
router.get('/:id',       getRoad);
router.get('/:id/health', getRoadHealth);

// Authority/Admin write
router.post('/',                          authorityAuth, createRoad);
router.patch('/:id',                      authorityAuth, updateRoad);
router.post('/:id/health/recompute',      authorityAuth, recomputeRoadHealth);

module.exports = router;
