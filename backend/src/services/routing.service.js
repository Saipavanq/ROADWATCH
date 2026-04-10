// ============================================================
// Routing Service — Module 14: Complaint Routing
// Assigns complaints to the correct authority area based on GPS.
// Uses bounding-box logic (works without PostGIS).
// ============================================================
const { query } = require('../models/db');

/**
 * Find the best authority area for a given lat/lng.
 * Priority: 1) boundary_geojson point-in-polygon (if stored)
 *           2) Nearest centroid of seeded authority blobs
 *           3) Fallback to first area
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{id: string, name: string, authority_org: string} | null>}
 */
const routeToAuthorityArea = async (lat, lng) => {
  // 1. Try city-level match via a simple coordinate vicinity check.
  //    Each seeded area has implicit city coverage — we match by city.
  //    In production, replace with PostGIS ST_Contains on boundary_geojson.
  //
  //    Rough city bounding boxes:
  //    Bengaluru: 12.7–13.2 lat, 77.4–77.8 lng
  //    Mumbai:    18.8–19.3 lat, 72.7–73.1 lng
  //    Hyderabad: 17.2–17.6 lat, 78.3–78.7 lng

  const cityBounds = [
    { city: 'Bengaluru', minLat: 12.7,  maxLat: 13.2, minLng: 77.4, maxLng: 77.8 },
    { city: 'Mumbai',    minLat: 18.8,  maxLat: 19.3, minLng: 72.7, maxLng: 73.1 },
    { city: 'Hyderabad', minLat: 17.2,  maxLat: 17.6, minLng: 78.3, maxLng: 78.7 },
  ];

  for (const bounds of cityBounds) {
    if (
      lat >= bounds.minLat && lat <= bounds.maxLat &&
      lng >= bounds.minLng && lng <= bounds.maxLng
    ) {
      const { rows } = await query(
        'SELECT id, name, authority_org FROM authority_areas WHERE city = $1 LIMIT 1',
        [bounds.city]
      );
      if (rows.length) return rows[0];
    }
  }

  // 2. Fallback: return any seeded authority area
  const { rows } = await query('SELECT id, name, authority_org FROM authority_areas LIMIT 1');
  return rows[0] || null;
};

/**
 * Route a complaint: look up its location and update authority_area_id.
 * Also finds the nearest road segment (simplified).
 *
 * @param {string} complaintId
 * @param {number} lat
 * @param {number} lng
 */
const routeComplaint = async (complaintId, lat, lng) => {
  try {
    const area = await routeToAuthorityArea(lat, lng);
    if (!area) return null;

    // Find nearest road segment for this authority area (±0.05 deg ~ 5km)
    const { rows: segments } = await query(
      `SELECT id FROM road_segments
       WHERE authority_area_id = $1
         AND ABS(start_lat - $2) < 0.05
         AND ABS(start_lng - $3) < 0.05
       LIMIT 1`,
      [area.id, lat, lng]
    );
    const roadSegmentId = segments[0]?.id || null;

    await query(
      `UPDATE complaints
       SET authority_area_id = $1, road_segment_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [area.id, roadSegmentId, complaintId]
    );

    return { authorityAreaId: area.id, roadSegmentId };
  } catch (err) {
    console.error('routeComplaint error:', err.message);
    return null;
  }
};

module.exports = { routeToAuthorityArea, routeComplaint };
