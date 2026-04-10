// ============================================================
// Road Health Service — Module 17: Road Health Scoring
// Computes a 0–100 health score per road segment based on
// open complaints, severity, and time since last repair.
// ============================================================
const { query } = require('../models/db');

// Severity weight table
const SEVERITY_WEIGHTS = { critical: 20, high: 10, medium: 5, low: 2 };

/**
 * Compute road health score for one road segment.
 * Score formula (0–100):
 *   Base = 100
 *   Deduct: severityWeight × complaintCount (capped per level)
 *   Deduct: age penalty (days since last repair / 365 × 15)
 *
 * @param {string} roadSegmentId
 * @returns {Promise<number>} score 0–100
 */
const computeHealthScore = async (roadSegmentId) => {
  // 1. Count open complaints by severity
  const { rows: complaints } = await query(
    `SELECT severity, COUNT(*) AS cnt
     FROM complaints
     WHERE road_segment_id = $1
       AND status NOT IN ('resolved', 'rejected')
     GROUP BY severity`,
    [roadSegmentId]
  );

  // 2. Count critical complaints
  const criticalRow = complaints.find(r => r.severity === 'critical');
  const criticalCount = criticalRow ? parseInt(criticalRow.cnt) : 0;

  // 3. Compute deductions from complaints
  let deduction = 0;
  for (const row of complaints) {
    const weight = SEVERITY_WEIGHTS[row.severity] || 2;
    // Cap each severity band contribution to avoid runaway penalties
    deduction += Math.min(weight * parseInt(row.cnt), weight * 5);
  }

  // 4. Age penalty: days since last_repaired_at or 730 days if unknown
  const { rows: segRows } = await query(
    'SELECT last_repaired_at FROM road_segments WHERE id = $1',
    [roadSegmentId]
  );
  const lastRepair = segRows[0]?.last_repaired_at;
  let ageDays = 730; // default 2 years
  if (lastRepair) {
    ageDays = Math.floor((Date.now() - new Date(lastRepair)) / (1000 * 60 * 60 * 24));
  }
  const agePenalty = Math.min((ageDays / 365) * 15, 30); // max 30 points

  // 5. Final score
  const score = Math.max(0, Math.min(100, 100 - deduction - agePenalty));

  // 6. Persist to road_health_scores and update road_segments.health_score
  const issueCount = complaints.reduce((acc, r) => acc + parseInt(r.cnt), 0);

  await query(
    `INSERT INTO road_health_scores
       (road_segment_id, score, issue_count, critical_count, last_repair_age_days)
     VALUES ($1, $2, $3, $4, $5)`,
    [roadSegmentId, score.toFixed(1), issueCount, criticalCount, ageDays]
  );

  await query(
    'UPDATE road_segments SET health_score = $1, updated_at = NOW() WHERE id = $2',
    [score.toFixed(1), roadSegmentId]
  );

  return parseFloat(score.toFixed(1));
};

/**
 * Recompute health scores for all road segments.
 * @returns {Promise<{updated: number, errors: number}>}
 */
const recomputeAll = async () => {
  const { rows } = await query('SELECT id FROM road_segments');
  let updated = 0, errors = 0;

  for (const row of rows) {
    try {
      await computeHealthScore(row.id);
      updated++;
    } catch (err) {
      console.error(`Health score failed for ${row.id}:`, err.message);
      errors++;
    }
  }

  return { updated, errors };
};

/**
 * Get health score label and color category.
 * @param {number} score
 * @returns {{ label: string, category: 'good'|'fair'|'poor'|'critical' }}
 */
const healthCategory = (score) => {
  if (score >= 70) return { label: 'Good', category: 'good' };
  if (score >= 40) return { label: 'Fair', category: 'fair' };
  if (score >= 20) return { label: 'Poor', category: 'poor' };
  return { label: 'Critical', category: 'critical' };
};

module.exports = { computeHealthScore, recomputeAll, healthCategory };
