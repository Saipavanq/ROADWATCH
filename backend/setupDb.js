const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function setup() {
  const adminClient = new Client({
    connectionString: 'postgresql://postgres:Saipavan1475!@localhost:5432/postgres'
  });

  try {
    await adminClient.connect();
    // Check if DB exists
    const dbRes = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'roadwatch'");
    if (dbRes.rowCount === 0) {
      console.log("Creating database 'roadwatch'...");
      await adminClient.query('CREATE DATABASE roadwatch');
    } else {
      console.log("Database 'roadwatch' already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err.message);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Connect to the new database to run schema
  const dbClient = new Client({
    connectionString: 'postgresql://postgres:Saipavan1475!@localhost:5432/roadwatch'
  });

  try {
    await dbClient.connect();
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log("Running schema.sql...");
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await dbClient.query(schemaSql);
    }

    const migrationPath = path.join(__dirname, '../database/phase2_migration.sql');
    if (fs.existsSync(migrationPath)) {
      console.log("Running phase2_migration.sql...");
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await dbClient.query(migrationSql);
    }

    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Error running migrations:", err.message);
  } finally {
    await dbClient.end();
  }
}

setup();
