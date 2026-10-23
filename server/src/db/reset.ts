// Reset script: drops all tables and re-runs init + seed
// Run: npm run db:reset
// WARNING: Destroys all data. Only use for development/demonstration.
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/railway.db');

console.log('⚠️  WARNING: This will erase all data and re-seed the database.');
console.log(`📁 Database file: ${DB_PATH}`);

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('   ✓ Existing database deleted');
}

// Re-run seed (which calls init internally)
execSync('npx tsx src/db/seed.ts', {
  cwd: path.resolve(__dirname, '../../..'),
  stdio: 'inherit',
  env: { ...process.env, DB_PATH },
});
