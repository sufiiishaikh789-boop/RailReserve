// Test setup — initializes a fresh in-memory test database before each test run
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_PATH = path.resolve(__dirname, '../data/test_railway.db');

// Point tests to the test database
process.env['DB_PATH'] = TEST_DB_PATH;
process.env['JWT_SECRET'] = 'test_jwt_secret_for_vitest';
process.env['PORT'] = '5001';

// Ensure data directory
const dataDir = path.dirname(TEST_DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Seed test database
const SCHEMA_PATH = path.resolve(__dirname, '../src/db/schema.sql');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const MIGRATIONS_DIR = path.resolve(__dirname, '../src/db/migrations');

export function resetTestDatabase(): void {
  // On Windows, the SQLite file may be briefly locked by a previous connection.
  // Retry deletion up to 3 times with a short delay before giving up.
  if (fs.existsSync(TEST_DB_PATH)) {
    let deleted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fs.unlinkSync(TEST_DB_PATH);
        deleted = true;
        break;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'EBUSY' || code === 'EPERM') {
          // Brief synchronous pause — acceptable in test setup context
          const start = Date.now();
          while (Date.now() - start < 100) { /* spin */ }
        } else {
          throw err;
        }
      }
    }
    if (!deleted && fs.existsSync(TEST_DB_PATH)) {
      // Cannot delete — the file is still locked. Truncate instead.
      fs.writeFileSync(TEST_DB_PATH, Buffer.alloc(0));
    }
  }

  const db = new DatabaseSync(TEST_DB_PATH);
  db.exec(schema);
  if (fs.existsSync(MIGRATIONS_DIR)) {
    const mFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of mFiles) {
      db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8'));
    }
  }

  // Minimal seed data for tests
  // Stations
  db.prepare('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)').run('SBC', 'Bengaluru City (Test)', 'Bengaluru', 'Karnataka');
  db.prepare('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)').run('MAS', 'Chennai Central (Test)', 'Chennai', 'Tamil Nadu');
  db.prepare('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)').run('MYS', 'Mysuru (Test)', 'Mysuru', 'Karnataka');
  db.prepare('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)').run('HYB', 'Hyderabad (Test)', 'Hyderabad', 'Telangana');

  // Train 1: SBC → MAS (has seats)
  db.prepare("INSERT INTO trains (train_number, name, type) VALUES ('12028', 'Test Shatabdi', 'SUPERFAST')").run();
  const train1Id = (db.prepare("SELECT id FROM trains WHERE train_number = '12028'").get() as { id: number }).id;
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, departure_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 1, ?, 0, 0)').run(train1Id, 'SBC', '06:00');
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, arrival_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 2, ?, 0, 367)').run(train1Id, 'MAS', '11:00');
  db.prepare("INSERT INTO train_classes (train_id, class_code, class_name, base_fare, total_seats, max_waiting_list) VALUES (?, 'CC', 'Chair Car', 650, 10, 5)").run(train1Id);

  // Train 2: SBC → MAS (WL only train)
  db.prepare("INSERT INTO trains (train_number, name, type) VALUES ('11013', 'Test Mail', 'EXPRESS')").run();
  const train2Id = (db.prepare("SELECT id FROM trains WHERE train_number = '11013'").get() as { id: number }).id;
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, departure_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 1, ?, 0, 0)').run(train2Id, 'SBC', '14:00');
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, arrival_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 2, ?, 0, 367)').run(train2Id, 'MAS', '19:30');
  db.prepare("INSERT INTO train_classes (train_id, class_code, class_name, base_fare, total_seats, max_waiting_list) VALUES (?, 'SL', 'Sleeper', 320, 5, 3)").run(train2Id);

  // Train 3: MAS → TVC (overnight, day_offset=1)
  db.prepare("INSERT INTO trains (train_number, name, type) VALUES ('12601', 'Test Night Express', 'EXPRESS')").run();
  const train3Id = (db.prepare("SELECT id FROM trains WHERE train_number = '12601'").get() as { id: number }).id;
  db.prepare('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)').run('TVC', 'Trivandrum (Test)', 'Thiruvananthapuram', 'Kerala');
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, departure_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 1, ?, 0, 0)').run(train3Id, 'MAS', '22:15');
  db.prepare('INSERT INTO train_routes (train_id, station_id, stop_sequence, arrival_time, day_offset, distance_km) VALUES (?, (SELECT id FROM stations WHERE code=?), 2, ?, 1, 722)').run(train3Id, 'TVC', '08:45');
  db.prepare("INSERT INTO train_classes (train_id, class_code, class_name, base_fare, total_seats, max_waiting_list) VALUES (?, '3A', 'AC 3 Tier', 1350, 10, 5)").run(train3Id);

  // Tomorrow's date for schedules
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Schedules
  db.prepare("INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)").run(train1Id, tomorrowStr);
  db.prepare("INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)").run(train2Id, tomorrowStr);
  db.prepare("INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)").run(train3Id, tomorrowStr);
  db.prepare("INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)").run(train1Id, nextWeekStr);
  db.prepare("INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)").run(train2Id, nextWeekStr);

  const sched1Id = (db.prepare("SELECT id FROM schedules WHERE train_id=? AND journey_date=?").get(train1Id, tomorrowStr) as { id: number }).id;
  const sched2Id = (db.prepare("SELECT id FROM schedules WHERE train_id=? AND journey_date=?").get(train2Id, tomorrowStr) as { id: number }).id;
  const sched3Id = (db.prepare("SELECT id FROM schedules WHERE train_id=? AND journey_date=?").get(train3Id, tomorrowStr) as { id: number }).id;
  const sched1NextWeek = (db.prepare("SELECT id FROM schedules WHERE train_id=? AND journey_date=?").get(train1Id, nextWeekStr) as { id: number }).id;
  const sched2NextWeek = (db.prepare("SELECT id FROM schedules WHERE train_id=? AND journey_date=?").get(train2Id, nextWeekStr) as { id: number }).id;

  // Inventory: train1 has 5 seats, train2 has 0 seats (WL), train3 overnight
  db.prepare("INSERT INTO seat_inventory (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list) VALUES (?, 'CC', 10, 5, 0, 5)").run(sched1Id);
  db.prepare("INSERT INTO seat_inventory (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list) VALUES (?, 'SL', 5, 0, 2, 3)").run(sched2Id);
  db.prepare("INSERT INTO seat_inventory (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list) VALUES (?, '3A', 10, 8, 0, 5)").run(sched3Id);
  db.prepare("INSERT INTO seat_inventory (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list) VALUES (?, 'CC', 10, 10, 0, 5)").run(sched1NextWeek);
  db.prepare("INSERT INTO seat_inventory (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list) VALUES (?, 'SL', 5, 5, 0, 3)").run(sched2NextWeek);

  // Admin user
  const hash = bcrypt.hashSync('TestAdmin123!', 10);
  db.prepare("INSERT INTO admin_users (username, password_hash, role) VALUES ('testadmin', ?, 'ADMIN')").run(hash);

  db.close();

  // Store test dates for use in tests
  process.env['TEST_DATE_TOMORROW'] = tomorrowStr;
  process.env['TEST_DATE_NEXT_WEEK'] = nextWeekStr;
  process.env['TEST_SCHED1_ID'] = String(sched1Id);
  process.env['TEST_SCHED2_ID'] = String(sched2Id);
  process.env['TEST_SCHED3_ID'] = String(sched3Id);
  process.env['TEST_TRAIN1_ID'] = String(train1Id);
  process.env['TEST_TRAIN2_ID'] = String(train2Id);
}

// Reset database before all tests
resetTestDatabase();
