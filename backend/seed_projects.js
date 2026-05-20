const { query } = require('./src/models/db');

async function seedBudgetData() {
  console.log('🌱 Seeding Contractor & Budget data...');
  try {
    // 1. Get a demo user (authority)
    const user = await query("SELECT id FROM users WHERE role = 'authority' LIMIT 1");
    if (!user.rows.length) throw new Error('No authority user found. Please run main seed first.');
    const authId = user.rows[0].id;

    // 2. Insert Contractors
    const contractors = await query(`
      INSERT INTO contractors (name, license_number, email, phone, rating, total_jobs, completed_jobs)
      VALUES 
        ('Alpha Road Construction', 'LIC-9982', 'alpha@roads.in', '9876543210', 4.8, 45, 42),
        ('City Builders Group',      'LIC-1123', 'city@builders.in', '9876543211', 4.2, 120, 115),
        ('NHAI Special Projects',    'LIC-0001', 'projects@nhai.gov.in', '9876543212', 4.9, 10, 8)
      RETURNING id, name
    `);
    const contractorIds = contractors.rows.map(r => r.id);

    // 3. Get some complaints to link to
    const complaints = await query("SELECT id FROM complaints LIMIT 3");
    if (!complaints.rows.length) throw new Error('No complaints found to link budget to.');

    // 4. Get budget allocation
    const allocations = await query("SELECT id FROM budget_allocations LIMIT 1");
    if (!allocations.rows.length) throw new Error('No budget allocations found.');
    const allocationId = allocations.rows[0].id;

    // 5. Insert Budget Transactions
    await query(`
      INSERT INTO budget_transactions (budget_allocation_id, complaint_id, contractor_id, amount, description)
      VALUES 
        ($1, $2, $3, 1500000, 'Major pothole repair and road resurfacing at MG Road intersection.'),
        ($1, $4, $5, 450000.50, 'Streetlight repair and divider painting on Outer Ring Road.'),
        ($1, $6, $3, 85000,   'Emergency drain clearing after waterlogging report.')
    `, [
      allocationId, 
      complaints.rows[0].id, contractorIds[0],
      complaints.rows[1].id, contractorIds[1],
      complaints.rows[2].id, contractorIds[0]
    ]);

    console.log('✅ Successfully seeded Budget & Contractor data!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    process.exit();
  }
}

seedBudgetData();
