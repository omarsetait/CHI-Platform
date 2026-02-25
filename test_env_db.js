import fs from 'fs';
import pg from 'pg';

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim();

console.log("Testing with URL:", dbUrl.replace(/:[^:@]+@/, ':***@'));

const client = new pg.Client({ connectionString: dbUrl });
client.connect()
  .then(() => {
    console.log("SUCCESSFULLY CONNECTED");
    return client.end();
  })
  .catch(err => {
    console.error("FAILED TO CONNECT:");
    console.error(err.message);
    process.exit(1);
  });
