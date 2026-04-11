const { query } = require('../models/db');

exports.getBudgets = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT b.*, a.name as authority_name
      FROM budget_allocations b
      JOIN authority_areas a ON b.authority_area_id = a.id
      ORDER BY b.fiscal_year DESC
    `);
    
    // Get transactions for each
    const allocations = await Promise.all(rows.map(async (row) => {
      const tx = await query('SELECT * FROM budget_transactions WHERE budget_allocation_id = $1 ORDER BY transacted_at DESC', [row.id]);
      return { ...row, transactions: tx.rows };
    }));

    res.json({ success: true, data: allocations });
  } catch (err) { next(err); }
};

exports.allocateFunds = async (req, res, next) => {
  try {
    const { authority_area_id, fiscal_year, amount } = req.body;
    const { rows } = await query(
      'INSERT INTO budget_allocations (authority_area_id, fiscal_year, allocated_amount) VALUES ($1, $2, $3) RETURNING *',
      [authority_area_id, fiscal_year, amount]
    );
    res.json({ success: true, data: rows[0] });
  } catch(err) { next(err); }
};
