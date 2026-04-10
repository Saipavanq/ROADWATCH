// ============================================================
// Database Connection Pool
// ============================================================
const { Pool } = require('pg');

// Use connectionString (DATABASE_URL) when provided; otherwise use
// individual host/port/user/password params. Mixing both causes pg
// to silently ignore individual fields.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'roadwatch',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error',   (err) => console.error('❌ DB Pool Error:', err));

/**
 * Execute a parameterized query
 * @param {string} text - SQL query
 * @param {Array}  params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
