const { query } = require('../models/db');

exports.getContractors = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM contractors ORDER BY rating DESC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.assignComplaint = async (req, res, next) => {
  try {
    const { complaint_id, contractor_id, notes } = req.body;
    
    // Check if contractor exists
    if (contractor_id) {
      const c = await query('SELECT * FROM contractors WHERE id = $1', [contractor_id]);
      if (!c.rows.length) return res.status(404).json({ success: false, message: 'Contractor not found' });
    }

    // Upsert assignment
    const { rows } = await query(`
      INSERT INTO complaint_assignments (complaint_id, assigned_to, contractor_id, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (complaint_id) DO UPDATE 
      SET contractor_id = EXCLUDED.contractor_id, assigned_to = EXCLUDED.assigned_to, notes = EXCLUDED.notes, assigned_at = NOW()
      RETURNING *
    `, [complaint_id, req.user.id, contractor_id, notes]);
    
    // Update complaint status to assigned
    await query("UPDATE complaints SET status = 'assigned' WHERE id = $1", [complaint_id]);

    res.json({ success: true, message: 'Complaint assigned successfully', data: rows[0] });
  } catch(err) { next(err); }
};
