const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
  console.log("Connection successful:", res.rows[0].now);
  pool.end();
  process.exit(0);
});
