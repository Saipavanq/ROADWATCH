const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgresql://postgres:Saipavan1475!@localhost:5432/roadwatch'
  });
  await c.connect();
  const res = await c.query('DELETE FROM users WHERE email = $1', ['mallampatisaipavan@gmail.com']);
  console.log('Deleted rows:', res.rowCount);
  await c.end();
}

run();
