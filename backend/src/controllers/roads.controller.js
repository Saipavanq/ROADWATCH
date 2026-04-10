// ============================================================
// Roads Controller — Modules 12 (Road Mapping) & 17 (Health)
// ============================================================
const { query } = require('../models/db');
const { computeHealthScore, healthCategory } = require('../services/roadHealth.service');

// ── List Road Segments ────────────────────────────────────────
exports.listRoads = async (req, res, next) => {
  try {
    const { authority_area_id, min_health, max_health, page = 1, limit = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (authority_area_id) { params.push(authority_area_id); whereClause += ` AND rs.authority_area_id = $${params.length}`; }
    if (min_health)        { params.push(parseFloat(min_health)); whereClause += ` AND rs.health_score >= $${params.length}`; }
    if (max_health)        { params.push(parseFloat(max_health)); whereClause += ` AND rs.health_score <= $${params.length}`; }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT rs.*,
              aa.name AS authority_name, aa.authority_org,
              (SELECT COUNT(*) FROM complaints WHERE road_segment_id = rs.id AND status NOT IN ('resolved','rejected')) AS open_issues
       FROM road_segments rs
       LEFT JOIN authority_areas aa ON aa.id = rs.authority_area_id
       ${whereClause}
       ORDER BY rs.health_score ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const enriched = rows.map(r => ({
      ...r,
      ...healthCategory(parseFloat(r.health_score) || 100),
    }));

    const countResult = await query(
      `SELECT COUNT(*) FROM road_segments rs ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      success: true,
      data: {
        roads: enriched,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (err) { next(err); }
};

// ── Get Single Road Segment ───────────────────────────────────
exports.getRoad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT rs.*, aa.name AS authority_name, aa.authority_org
       FROM road_segments rs
       LEFT JOIN authority_areas aa ON aa.id = rs.authority_area_id
       WHERE rs.id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Road segment not found' });

    const road = { ...rows[0], ...healthCategory(parseFloat(rows[0].health_score) || 100) };

    // Recent health score history
    const { rows: history } = await query(
      'SELECT score, issue_count, critical_count, computed_at FROM road_health_scores WHERE road_segment_id = $1 ORDER BY computed_at DESC LIMIT 10',
      [id]
    );

    // Complaints on this road
    const { rows: complaints } = await query(
      `SELECT id, reference_no, issue_type, severity, status, created_at, title
       FROM complaints WHERE road_segment_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: { road, healthHistory: history, complaints },
    });
  } catch (err) { next(err); }
};

// ── Create Road Segment ───────────────────────────────────────
exports.createRoad = async (req, res, next) => {
  try {
    const {
      name, road_type = 'local', authority_area_id,
      start_lat, start_lng, end_lat, end_lng,
      length_km, surface_type = 'asphalt', last_repaired_at,
    } = req.body;

    if (!start_lat || !start_lng)
      return res.status(400).json({ success: false, message: 'start_lat and start_lng are required' });

    const { rows } = await query(
      `INSERT INTO road_segments
         (name, road_type, authority_area_id, start_lat, start_lng, end_lat, end_lng,
          length_km, surface_type, last_repaired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name || `Unnamed Road`, road_type, authority_area_id || null,
        parseFloat(start_lat), parseFloat(start_lng),
        end_lat ? parseFloat(end_lat) : null, end_lng ? parseFloat(end_lng) : null,
        length_km ? parseFloat(length_km) : null, surface_type,
        last_repaired_at || null,
      ]
    );

    res.status(201).json({ success: true, message: 'Road segment created', data: { road: rows[0] } });
  } catch (err) { next(err); }
};

// ── Update Road Segment ───────────────────────────────────────
exports.updateRoad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, road_type, surface_type, last_repaired_at, length_km } = req.body;

    const { rows } = await query(
      `UPDATE road_segments
       SET name = COALESCE($1, name),
           road_type = COALESCE($2, road_type),
           surface_type = COALESCE($3, surface_type),
           last_repaired_at = COALESCE($4, last_repaired_at),
           length_km = COALESCE($5, length_km),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, road_type, surface_type, last_repaired_at, length_km, id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: 'Road not found' });

    // Recompute health score after update
    await computeHealthScore(id);

    res.json({ success: true, message: 'Road updated', data: { road: rows[0] } });
  } catch (err) { next(err); }
};

// ── Get Health Score History ──────────────────────────────────
exports.getRoadHealth = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'SELECT * FROM road_health_scores WHERE road_segment_id = $1 ORDER BY computed_at DESC LIMIT 30',
      [id]
    );
    res.json({ success: true, data: { history: rows } });
  } catch (err) { next(err); }
};

// ── Trigger Health Score Recompute for One Road ───────────────
exports.recomputeRoadHealth = async (req, res, next) => {
  try {
    const { id } = req.params;
    const score = await computeHealthScore(id);
    res.json({ success: true, message: 'Health score recomputed', data: { score, ...healthCategory(score) } });
  } catch (err) { next(err); }
};
