// Database initialization script
// Run: npm run db:init
// Safe to re-run: uses IF NOT EXISTS throughout schema
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/railway.db');

const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`🗄️  Initializing database at: ${DB_PATH}`);

const db = new DatabaseSync(DB_PATH);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

db.exec(schema);

console.log('✅ Schema initialized successfully.');
console.log('   Tables created: stations, trains, train_routes, train_classes,');
console.log('   schedules, seat_inventory, bookings, booking_passengers,');
console.log('   payments, cancellations, waiting_list_queue, audit_logs, admin_users');

db.close();
