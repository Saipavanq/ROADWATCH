// ============================================================
// Complaints Controller
// Modules: 8 (Create), 9 (Dedup), 11 (Store), 14 (Route), 15 (Status)
// ============================================================
const { v4: uuidv4 } = require('uuid');
const axios  = require('axios').default;
const path   = require('path');
const asyncHandler = require('express-async-handler');
const { query } = require('../models/db');
const { routeComplaint } = require('../services/routing.service');
const logger = require('../utils/logger');

// Generate reference number: RW-YYYY-NNNNN
const generateRefNo = async () => {
  const year = new Date().getFullYear();
  const count = await query('SELECT COUNT(*) FROM complaints');
  const seq = String(parseInt(count.rows[0].count) + 1).padStart(5, '0');
  return `RW-${year}-${seq}`;
};

// Check for duplicates within 50m radius using approx math
const checkDuplicate = async (lat, lng, issueType) => {
  const { rows } = await query(
    `SELECT id, reference_no FROM complaints
     WHERE issue_type = $1
       AND (status = 'submitted' OR status = 'under_review' OR status = 'in_progress')
       AND created_at > NOW() - INTERVAL '14 days'
       AND ABS(latitude - $2) < 0.0005
       AND ABS(longitude - $3) < 0.0005
     ORDER BY created_at DESC
     LIMIT 1`,
    [issueType, lat, lng]
  );
  return rows[0] || null;
};

// Find authority area for coordinates — now delegated to routing.service.js
// (kept as thin wrapper for backward compatibility)
const findAuthorityArea = async (lat, lng) => {
  const { routeToAuthorityArea } = require('../services/routing.service');
  const area = await routeToAuthorityArea(lat, lng);
  return area?.id || null;
};

// ── Create Complaint ──────────────────────────────────────────
exports.createComplaint = asyncHandler(async (req, res, next) => {
    const userId = req.user?.id;
    const {
      latitude, longitude, address_text,
      issue_type = 'other', severity = 'medium',
      title, description,
    } = req.body;

    if (!latitude || !longitude)
      return res.status(400).json({ success: false, message: 'Location (lat/lng) is required' });

    let parentComplaintId = null;
    const duplicate = await checkDuplicate(parseFloat(latitude), parseFloat(longitude), issue_type);
    if (duplicate) {
      parentComplaintId = duplicate.id;
      // Auto-upvote the parent
      await query('UPDATE complaints SET upvotes = upvotes + 1 WHERE id = $1', [duplicate.id]);
    }

    const referenceNo = await generateRefNo();
    const authorityAreaId = await findAuthorityArea(parseFloat(latitude), parseFloat(longitude));

    // Insert complaint
    const { rows } = await query(
      `INSERT INTO complaints
         (reference_no, user_id, latitude, longitude, address_text,
          issue_type, severity, title, description, authority_area_id, 
          is_duplicate, parent_complaint_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        referenceNo, userId || null,
        parseFloat(latitude), parseFloat(longitude),
        address_text || null, issue_type, severity,
        title || `${issue_type} reported`, description || null,
        authorityAreaId,
        !!parentComplaintId, parentComplaintId
      ]
    );
    const complaint = rows[0];

    // Save uploaded images (Module 3, 11)
    if (req.files && req.files.length > 0) {
      const imageInserts = req.files.map((file, idx) =>
        query(
          'INSERT INTO complaint_images (complaint_id, url, is_primary) VALUES ($1, $2, $3)',
          [complaint.id, `/uploads/complaints/${file.filename}`, idx === 0]
        )
      );
      await Promise.all(imageInserts);

      // Trigger AI analysis async (Module 5)
      triggerAIAnalysis(complaint.id, req.files[0].filename).catch(console.error);
    }

    // Status log
    await query(
      'INSERT INTO complaint_status_log (complaint_id, new_status, changed_by) VALUES ($1, $2, $3)',
      [complaint.id, 'submitted', userId || null]
    );

    // Route complaint to authority area (Module 14) — runs async
    routeComplaint(complaint.id, parseFloat(latitude), parseFloat(longitude)).catch(console.error);

    // Emit socket event
    const io = req.app.get('io');
    if (io) io.emit('new_complaint', { id: complaint.id, referenceNo, severity, issueType: issue_type });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: { complaint: { ...complaint }, referenceNo },
    });
});

// ── Background AI Analysis ────────────────────────────────────
const triggerAIAnalysis = async (complaintId, filename) => {
  try {
    const aiUrl = `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/analyze`;
    const res = await axios.post(aiUrl, {
      image_path: path.join('uploads', 'complaints', filename),
      complaint_id: complaintId,
    }, { timeout: 30000 });

    const { issue_type, severity, confidence, notes } = res.data;
    await query(
      `UPDATE complaints
       SET ai_analyzed = TRUE, ai_confidence = $1, ai_issue_type = $2,
           ai_severity = $3, ai_notes = $4, updated_at = NOW()
       WHERE id = $5`,
      [confidence, issue_type, severity, notes, complaintId]
    );
  } catch (err) {
    console.error('AI analysis failed:', err.message);
  }
};

// ── List Complaints ───────────────────────────────────────────
exports.listComplaints = asyncHandler(async (req, res, next) => {
    const {
      status, severity, issue_type,
      page = 1, limit = 20,
      lat, lng, radius_km = 5,
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status)     { params.push(status);     whereClause += ` AND c.status = $${params.length}`; }
    if (severity)   { params.push(severity);   whereClause += ` AND c.severity = $${params.length}`; }
    if (issue_type) { params.push(issue_type); whereClause += ` AND c.issue_type = $${params.length}`; }

    // My complaints only
    if (req.query.my === 'true' && req.user) {
      params.push(req.user.id);
      whereClause += ` AND c.user_id = $${params.length}`;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const { rows } = await query(
      `SELECT c.*,
              u.name AS reporter_name,
              (SELECT url FROM complaint_images WHERE complaint_id = c.id AND is_primary = TRUE LIMIT 1) AS primary_image
       FROM complaints c
       LEFT JOIN users u ON u.id = c.user_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM complaints c ${whereClause}`,
      params.slice(0, params.length - 2)
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: { complaints: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } },
    });
});

// ── Get Complaint by ID ───────────────────────────────────────
exports.getComplaint = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT c.*,
              u.name AS reporter_name, u.email AS reporter_email,
              aa.name AS authority_name, aa.authority_org
       FROM complaints c
       LEFT JOIN users u  ON u.id  = c.user_id
       LEFT JOIN authority_areas aa ON aa.id = c.authority_area_id
       WHERE c.id = $1 OR c.reference_no = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    const complaint = rows[0];

    // Get images
    const images = await query('SELECT * FROM complaint_images WHERE complaint_id = $1', [complaint.id]);
    // Get status history
    const history = await query(
      `SELECT sl.*, u.name AS changed_by_name
       FROM complaint_status_log sl
       LEFT JOIN users u ON u.id = sl.changed_by
       WHERE sl.complaint_id = $1 ORDER BY sl.changed_at ASC`,
      [complaint.id]
    );

    res.json({ success: true, data: { complaint: { ...complaint, images: images.rows, statusHistory: history.rows } } });
});

// ── Update Status ─────────────────────────────────────────────
exports.updateStatus = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['submitted','under_review','assigned','in_progress','resolved','rejected','escalated'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const current = await query('SELECT id, status FROM complaints WHERE id = $1', [id]);
    if (!current.rows.length)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    const oldStatus = current.rows[0].status;

    await query('UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    await query(
      'INSERT INTO complaint_status_log (complaint_id, old_status, new_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [id, oldStatus, status, req.user.id, notes || null]
    );

    // Notify citizen via socket
    const io = req.app.get('io');
    if (io) io.to(`complaint_${id}`).emit('status_updated', { id, status, notes });

    res.json({ success: true, message: 'Status updated', data: { id, oldStatus, newStatus: status } });
});

// ── Resolve Complaint ───────────────────────────────────────────
exports.resolveComplaint = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;
    
    let resolvedImageUrl = null;
    if (req.file) {
      resolvedImageUrl = `/uploads/complaints/${req.file.filename}`;
    }

    const current = await query('SELECT id, status FROM complaints WHERE id = $1', [id]);
    if (!current.rows.length)
      return res.status(404).json({ success: false, message: 'Complaint not found' });

    const oldStatus = current.rows[0].status;

    await query(
      'UPDATE complaints SET status = $1, resolved_image_url = $2, updated_at = NOW() WHERE id = $3', 
      ['resolved', resolvedImageUrl, id]
    );

    await query(
      'INSERT INTO complaint_status_log (complaint_id, old_status, new_status, changed_by, notes) VALUES ($1,$2,$3,$4,$5)',
      [id, oldStatus, 'resolved', req.user.id, notes || 'Resolved by authority']
    );

    // Notify citizen via socket
    const io = req.app.get('io');
    if (io) io.to(`complaint_${id}`).emit('status_updated', { id, status: 'resolved', notes });

    res.json({ success: true, message: 'Complaint marked as resolved', data: { id, resolvedImageUrl } });
});

// ── Upvote ────────────────────────────────────────────────────
exports.upvote = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { rows } = await query(
      'UPDATE complaints SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes',
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: { upvotes: rows[0].upvotes } });
});

// ── Dashboard Statistics ──────────────────────────────────────
exports.getStats = asyncHandler(async (req, res, next) => {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'submitted')     AS submitted,
        COUNT(*) FILTER (WHERE status = 'in_progress')  AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved')     AS resolved,
        COUNT(*) FILTER (WHERE severity = 'critical')   AS critical,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS last_7_days,
        COUNT(*) AS total
      FROM complaints
    `);

    const byType = await query(`
      SELECT issue_type, COUNT(*) as count
      FROM complaints GROUP BY issue_type ORDER BY count DESC
    `);

    const weeklyActivity = await query(`
      SELECT 
        DATE(created_at) as date,
        to_char(created_at, 'Dy') AS name,
        COUNT(*) AS reported,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
      FROM complaints
      WHERE created_at >= current_date - interval '6 days'
      GROUP BY DATE(created_at), to_char(created_at, 'Dy')
      ORDER BY DATE(created_at) ASC
    `);

    res.json({ success: true, data: { overview: stats.rows[0], byType: byType.rows, weeklyActivity: weeklyActivity.rows } });
});

