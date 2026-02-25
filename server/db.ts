import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 10 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: !isProduction,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

export const db = drizzle(pool, { schema });

export async function closePool(): Promise<void> {
  console.log('[DB] Closing database connection pool...');
  await pool.end();
  console.log('[DB] Database connection pool closed');
}
