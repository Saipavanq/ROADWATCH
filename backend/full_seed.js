const { query } = require('./src/models/db');

async function fullDemoSeed() {
  console.log('🚀 Starting Full Demo Seed...');
  try {
    // 0. Clean state
    await query("TRUNCATE budget_transactions, budget_allocations, complaints, contractors CASCADE");

    // 1. Get Authority Area
    const area = await query("SELECT id FROM authority_areas LIMIT 1");
    if (!area.rows.length) throw new Error('No authority areas found.');
    const areaId = area.rows[0].id;

    // 2. Get User
    const user = await query("SELECT id FROM users WHERE role = 'citizen' LIMIT 1");
    const userId = user.rows.length ? user.rows[0].id : null;

    // 3. Insert Budget Allocation
    const allocation = await query(`
      INSERT INTO budget_allocations (authority_area_id, fiscal_year, allocated_amount, spent_amount)
      VALUES ($1, '2024-25', 10000000.00, 0)
      RETURNING id
    `, [areaId]);
    const allocationId = allocation.rows[0].id;

    // 4. Insert Complaints (GPS locations)
    const complaints = await query(`
      INSERT INTO complaints (reference_no, user_id, authority_area_id, latitude, longitude, issue_type, severity, status, title)
      VALUES 
        ('RW-2024-101', $1, $2, 12.9716, 77.5946, 'pothole', 'critical', 'in_progress', 'Main Road Pothole Cluster'),
        ('RW-2024-102', $1, $2, 12.9352, 77.6245, 'waterlogging', 'high', 'resolved', 'Flooded Subway Repair'),
        ('RW-2024-103', $1, $2, 12.9082, 77.6476, 'crack', 'medium', 'in_progress', 'Structural Cracks on Flyover')
      RETURNING id
    `, [userId, areaId]);

    // 5. Insert Contractors
    const contractors = await query(`
      INSERT INTO contractors (name, license_number, email, phone, rating, total_jobs, completed_jobs)
      VALUES 
        ('Alpha Road Construction', 'LIC-9982', 'alpha@roads.in', '9876543210', 4.8, 45, 42),
        ('City Builders Group',      'LIC-1123', 'city@builders.in', '9876543211', 4.2, 120, 115)
      RETURNING id
    `);
    const contractorIds = contractors.rows.map(r => r.id);

    // 6. Insert Budget Transactions (Linking everything)
    await query(`
      INSERT INTO budget_transactions (budget_allocation_id, complaint_id, contractor_id, amount, description)
      VALUES 
        ($1, $2, $3, 1250000, 'Relaying 500m of asphalt at MG Road'),
        ($1, $4, $5, 345000,  'Desilting drains and installing new pump'),
        ($1, $6, $3, 750000,  'Epoxy injection for structural cracks')
    `, [
      allocationId,
      complaints.rows[0].id, contractorIds[0],
      complaints.rows[1].id, contractorIds[1],
      complaints.rows[2].id
    ]);

    // 7. Update spent_amount in allocations
    await query(`
        UPDATE budget_allocations 
        SET spent_amount = (SELECT SUM(amount) FROM budget_transactions WHERE budget_allocation_id = $1)
        WHERE id = $1
    `, [allocationId]);

    console.log('✅ Full Demo Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    process.exit();
  }
}

fullDemoSeed();
