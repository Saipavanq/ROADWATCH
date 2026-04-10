const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const client = new Client({ ...dbConfig, database: 'postgres' });

  try {
    await client.connect();
    console.log('Connected to default postgres database.');
    
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'roadwatch'");
    if (res.rowCount === 0) {
      console.log('Creating roadwatch database...');
      await client.query('CREATE DATABASE roadwatch');
      console.log('Database roadwatch created.');
    } else {
      console.log('Database roadwatch already exists.');
    }
  } catch (err) {
    console.error('Error connecting to postgres:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Now connect to roadwatch and apply schemas
  const rwClient = new Client({ ...dbConfig, database: 'roadwatch' });
  try {
    await rwClient.connect();
    console.log('Connected to roadwatch database.');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Running schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await rwClient.query(schemaSql);
      console.log('schema.sql executed successfully.');
    } else {
      console.log('schema.sql not found at', schemaPath);
    }

    const migrationPath = path.join(__dirname, '../database/phase2_migration.sql');
    if (fs.existsSync(migrationPath)) {
      console.log('Running phase2_migration.sql...');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await rwClient.query(migrationSql);
      console.log('phase2_migration.sql executed successfully.');
    } else {
      console.log('phase2_migration.sql not found at', migrationPath);
    }

  } catch (err) {
    console.error('Error executing schema for roadwatch:', err.message);
  } finally {
    await rwClient.end();
  }
}

initDB();
