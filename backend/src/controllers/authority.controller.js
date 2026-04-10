// ============================================================
// Authority Controller — Phase 2
// Modules: 10 (Escalation), 13 (Authority Mapping), 14 (Routing)
// ============================================================
const { query } = require('../models/db');
const { recomputeAll, computeHealthScore, healthCategory } = require('../services/roadHealth.service');
const { routeComplaint } = require('../services/routing.service');

// ── Helper: Create Notification ───────────────────────────────
// Defined first so it can be used by all handlers below.
const createNotification = async (userId, complaintId, type, title, message) => {
  try {
    await query(
      'INSERT INTO notifications (user_id, complaint_id, type, title, message) VALUES ($1,$2,$3,$4,$5)',
      [userId, complaintId, type, title, message]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// ── Authority Dashboard Overview ─────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    // Determine authority area(s) this user manages
    let areaFilter = '';
    const params = [];

    if (user.role !== 'admin') {
      // Authority officers see complaints for their area
      // In production, link user → authority_area via a junction table.
      // For now: authority users see ALL complaints (demo simplification).
    }

    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'submitted')     AS pending,
        COUNT(*) FILTER (WHERE status = 'under_review')  AS under_review,
        COUNT(*) FILTER (WHERE status = 'assigned')      AS assigned,
        COUNT(*) FILTER (WHERE status = 'in_progress')   AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at > NOW() - INTERVAL '1 day') AS resolved_today,
        COUNT(*) FILTER (WHERE status = 'escalated')     AS escalated,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved','rejected')) AS open_critical,
        COUNT(*) AS total
      FROM complaints
    `);

    const recentActivity = await query(`
      SELECT sl.*, c.reference_no, c.issue_type, u.name AS changed_by_name
      FROM complaint_status_log sl
      JOIN complaints c ON c.id = sl.complaint_id
      LEFT JOIN users u ON u.id = sl.changed_by
      ORDER BY sl.changed_at DESC
      LIMIT 10
    `);

    const topIssues = await query(`
      SELECT issue_type, severity, COUNT(*) AS cnt
      FROM complaints
      WHERE status NOT IN ('resolved', 'rejected')
      GROUP BY issue_type, severity
      ORDER BY cnt DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        recentActivity: recentActivity.rows,
        topIssues: topIssues.rows,
      },
    });
  } catch (err) { next(err); }
};

// ── List Complaints for Authority ─────────────────────────────
exports.listComplaints = async (req, res, next) => {
  try {
    const {
      status, severity, issue_type, authority_area_id,
      page = 1, limit = 20, sort = 'created_at', order = 'DESC',
    } = req.query;

    const allowedSort  = ['created_at', 'severity', 'status', 'upvotes'];
    const allowedOrder = ['ASC', 'DESC'];
    const sortCol  = allowedSort.includes(sort) ? `c.${sort}` : 'c.created_at';
    const sortDir  = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status)           { params.push(status);           whereClause += ` AND c.status = $${params.length}`; }
    if (severity)         { params.push(severity);         whereClause += ` AND c.severity = $${params.length}`; }
    if (issue_type)       { params.push(issue_type);       whereClause += ` AND c.issue_type = $${params.length}`; }
    if (authority_area_id){ params.push(authority_area_id);whereClause += ` AND c.authority_area_id = $${params.length}`; }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT c.*,
              u.name   AS reporter_name, u.email AS reporter_email,
              aa.name  AS authority_name, aa.authority_org,
              (SELECT url FROM complaint_images WHERE complaint_id = c.id AND is_primary = TRUE LIMIT 1) AS primary_image,
              ca.assigned_to, ca.contractor_id, ca.due_date,
              au.name AS assigned_officer_name
       FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN authority_areas aa ON aa.id = c.authority_area_id
       LEFT JOIN complaint_assignments ca ON ca.complaint_id = c.id
       LEFT JOIN users au ON au.id = ca.assigned_to
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM complaints c ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      success: true,
      data: {
        complaints: rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
        },
      },
    });
  } catch (err) { next(err); }
};

// ── Assign Complaint ──────────────────────────────────────────
exports.assignComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to, contractor_id, due_date, notes } = req.body;

    // Upsert assignment
    await query(
      `INSERT INTO complaint_assignments (complaint_id, assigned_to, contractor_id, due_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (complaint_id)
       DO UPDATE SET assigned_to = $2, contractor_id = $3, due_date = $4, notes = $5, assigned_at = NOW()`,
      [id, assigned_to || null, contractor_id || null, due_date || null, notes || null]
    );

    // Update complaint status to 'assigned'
    const current = await query('SELECT status FROM complaints WHERE id = $1', [id]);
    const oldStatus = current.rows[0]?.status;

    await query("UPDATE complaints SET status = 'assigned', updated_at = NOW() WHERE id = $1", [id]);
    await query(
      'INSERT INTO complaint_status_log (complaint_id, old_status, new_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [id, oldStatus, 'assigned', req.user.id, notes || 'Complaint assigned']
    );

    // Create notification for reporter
    const complaint = await query('SELECT user_id, reference_no FROM complaints WHERE id = $1', [id]);
    if (complaint.rows[0]?.user_id) {
      await createNotification(
        complaint.rows[0].user_id, id, 'assignment',
        'Your complaint has been assigned',
        `Complaint ${complaint.rows[0].reference_no} has been assigned to an officer and is being processed.`
      );
    }

    // Socket notification
    const io = req.app.get('io');
    if (io) io.to(`complaint_${id}`).emit('status_updated', { id, status: 'assigned', notes });

    res.json({ success: true, message: 'Complaint assigned successfully' });
  } catch (err) { next(err); }
};

// ── Escalate Complaint (Module 10) ────────────────────────────
exports.escalateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const current = await query(
      'SELECT status, reference_no, user_id FROM complaints WHERE id = $1', [id]
    );
    if (!current.rows.length)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    const { status: oldStatus, reference_no, user_id } = current.rows[0];

    await query("UPDATE complaints SET status = 'escalated', updated_at = NOW() WHERE id = $1", [id]);
    await query(
      'INSERT INTO complaint_status_log (complaint_id, old_status, new_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [id, oldStatus, 'escalated', req.user.id, reason || 'Manually escalated by authority']
    );

    // Notify citizen
    if (user_id) {
      await createNotification(
        user_id, id, 'escalation',
        'Your complaint has been escalated',
        `Complaint ${reference_no} has been escalated for priority handling. Reason: ${reason || 'SLA breach / urgent issue'}`
      );
    }

    const io = req.app.get('io');
    if (io) io.to(`complaint_${id}`).emit('status_updated', { id, status: 'escalated', reason });

    res.json({ success: true, message: 'Complaint escalated successfully' });
  } catch (err) { next(err); }
};

// ── Auto-Escalation (Module 10) — called by scheduler ─────────
exports.autoEscalateStalledComplaints = async () => {
  try {
    // Escalate any complaint still 'submitted' or 'under_review' after 7 days
    const { rows } = await query(`
      SELECT id, reference_no, user_id FROM complaints
      WHERE status IN ('submitted', 'under_review')
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    for (const c of rows) {
      await query("UPDATE complaints SET status = 'escalated', updated_at = NOW() WHERE id = $1", [c.id]);
      await query(
        "INSERT INTO complaint_status_log (complaint_id, old_status, new_status, notes) VALUES ($1,'submitted','escalated','Auto-escalated: no action taken within 7 days')",
        [c.id]
      );
      if (c.user_id) {
        await createNotification(
          c.user_id, c.id, 'escalation',
          'Your complaint has been escalated',
          `Complaint ${c.reference_no} has been escalated as no action was taken within 7 days.`
        );
      }
    }

    if (rows.length) console.log(`⚡ Auto-escalated ${rows.length} stalled complaint(s).`);
    return rows.length;
  } catch (err) {
    console.error('Auto-escalate error:', err.message);
    return 0;
  }
};

// ── Authority Areas ───────────────────────────────────────────
exports.getAuthorityAreas = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM authority_areas ORDER BY name');
    res.json({ success: true, data: { areas: rows } });
  } catch (err) { next(err); }
};

// ── Road Health Scores ────────────────────────────────────────
exports.getRoadHealth = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT rs.id, rs.name, rs.road_type, rs.health_score, rs.last_repaired_at,
             aa.name AS authority_name, aa.authority_org,
             (SELECT COUNT(*) FROM complaints WHERE road_segment_id = rs.id AND status NOT IN ('resolved','rejected')) AS open_issues
      FROM road_segments rs
      LEFT JOIN authority_areas aa ON aa.id = rs.authority_area_id
      ORDER BY rs.health_score ASC
    `);

    const enriched = rows.map(r => ({
      ...r,
      ...healthCategory(parseFloat(r.health_score) || 100),
    }));

    res.json({ success: true, data: { roads: enriched } });
  } catch (err) { next(err); }
};

// ── Recompute All Road Health Scores ─────────────────────────
exports.recomputeRoadHealth = async (req, res, next) => {
  try {
    const result = await recomputeAll();
    res.json({ success: true, message: 'Road health recomputed', data: result });
  } catch (err) { next(err); }
};


