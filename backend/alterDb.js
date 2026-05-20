require('dotenv').config();
const { pool } = require('./src/models/db');

async function run() {
  try {
    console.log('Altering the database schema...');
    
    // Attempt adding is_verified (might fail if it exists, use IF NOT EXISTS workaround or just simple ALTER)
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;');
    console.log('Added is_verified column');
    
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);');
    console.log('Added otp_code column');
    
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;');
    console.log('Added otp_expires_at column');

    // Make all existing active users verified to not break them
    await pool.query('UPDATE users SET is_verified = TRUE WHERE is_active = TRUE;');

    console.log('Database successfully altered!');
    process.exit(0);
  } catch (err) {
    console.error('Error altering schema:', err);
    process.exit(1);
  }
}

run();
