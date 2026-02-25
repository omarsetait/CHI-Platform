import pg from "pg";
const { Client } = pg;

async function setupSchema() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to database");
    await client.query("CREATE SCHEMA IF NOT EXISTS ihop;");
    console.log("Schema 'ihop' created or already exists");
  } catch (err) {
    console.error("Error creating schema:", err);
  } finally {
    await client.end();
  }
}

setupSchema();
