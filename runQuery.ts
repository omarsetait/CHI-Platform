import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`ALTER TABLE fwa_provider_detection_results ADD COLUMN IF NOT EXISTS rag_score decimal(5,2);`);
  await db.execute(sql`ALTER TABLE fwa_doctor_detection_results ADD COLUMN IF NOT EXISTS rag_score decimal(5,2);`);
  await db.execute(sql`ALTER TABLE fwa_patient_detection_results ADD COLUMN IF NOT EXISTS rag_score decimal(5,2);`);
  
  await db.execute(sql`UPDATE fwa_provider_detection_results SET rag_score = rag_llm_score;`);
  console.log("Columns added successfully.");
  process.exit(0);
}
main();
