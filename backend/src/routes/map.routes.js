// ============================================================
// Map Routes — Road segments, heatmap data, authority areas
// ============================================================
const express = require('express');
const router  = express.Router();
const { query } = require('../models/db');

// GET /api/map/heatmap — complaint coordinates for heatmap
router.get('/heatmap', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT latitude, longitude, severity,
              COUNT(*) OVER (PARTITION BY ROUND(latitude::numeric,3), ROUND(longitude::numeric,3)) as density
       FROM complaints
       WHERE status != 'rejected'
       ORDER BY created_at DESC
       LIMIT 2000`
    );
    res.json({ success: true, data: { points: rows } });
  } catch (err) { next(err); }
});

// GET /api/map/roads — road segments
router.get('/roads', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT rs.*, aa.name AS authority_name, aa.authority_org
       FROM road_segments rs
       LEFT JOIN authority_areas aa ON aa.id = rs.authority_area_id
       LIMIT 500`
    );
    res.json({ success: true, data: { roads: rows } });
  } catch (err) { next(err); }
});

// GET /api/map/authority-areas — all authority zones
router.get('/authority-areas', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM authority_areas ORDER BY name');
    res.json({ success: true, data: { areas: rows } });
  } catch (err) { next(err); }
});

// GET /api/map/clusters — complaint clusters for map markers
router.get('/clusters', async (req, res, next) => {
  try {
    const { bounds } = req.query; // "minLat,minLng,maxLat,maxLng"
    let whereClause = "WHERE status != 'rejected'";
    const params = [];

    if (bounds) {
      const [minLat, minLng, maxLat, maxLng] = bounds.split(',').map(Number);
      params.push(minLat, maxLat, minLng, maxLng);
      whereClause += ` AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`;
    }

    const { rows } = await query(
      `SELECT id, reference_no, latitude, longitude, issue_type, severity, status, title, created_at,
              (SELECT url FROM complaint_images WHERE complaint_id = complaints.id AND is_primary=TRUE LIMIT 1) AS thumbnail
       FROM complaints
       ${whereClause}
       ORDER BY created_at DESC LIMIT 1000`,
      params
    );
    res.json({ success: true, data: { markers: rows } });
  } catch (err) { next(err); }
});

module.exports = router;
