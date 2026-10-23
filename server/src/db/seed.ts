// Fictional seed data for academic demonstration
// Run: npm run db:seed
// DISCLAIMER: All trains, stations, schedules, and passengers are FICTIONAL.
// This system has no connection to Indian Railways or IRCTC.
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../data/railway.db');

// Run init first if DB doesn't exist
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('🌱 Seeding fictional demonstration data...');
console.log('   ⚠️  All data is fictional for academic purposes only.');

// Clear existing seed data for reproducibility
db.exec(`
  DELETE FROM audit_logs;
  DELETE FROM waiting_list_queue;
  DELETE FROM cancellations;
  DELETE FROM payments;
  DELETE FROM booking_passengers;
  DELETE FROM bookings;
  DELETE FROM seat_inventory;
  DELETE FROM schedules;
  DELETE FROM train_classes;
  DELETE FROM train_routes;
  DELETE FROM trains;
  DELETE FROM stations;
  DELETE FROM admin_users;
`);

// ============================================================
// STATIONS (fictional representation of real city stations)
// ============================================================
const stationInsert = db.prepare(
  'INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)'
);

const stations = [
  ['SBC', 'Bengaluru City Junction (Demo)', 'Bengaluru', 'Karnataka'],
  ['MAS', 'Chennai Central (Demo)', 'Chennai', 'Tamil Nadu'],
  ['MYS', 'Mysuru Junction (Demo)', 'Mysuru', 'Karnataka'],
  ['HYB', 'Hyderabad Deccan (Demo)', 'Hyderabad', 'Telangana'],
  ['TVC', 'Thiruvananthapuram Central (Demo)', 'Thiruvananthapuram', 'Kerala'],
  ['CSTM', 'Chhatrapati Shivaji Terminus (Demo)', 'Mumbai', 'Maharashtra'],
  ['UBL', 'Hubballi Junction (Demo)', 'Hubballi', 'Karnataka'],
  ['BPL', 'Bhopal Junction (Demo)', 'Bhopal', 'Madhya Pradesh'],
];

const stationIds: Record<string, number> = {};
for (const [code, name, city, state] of stations) {
  const result = stationInsert.run(code, name, city, state) as { lastInsertRowid: number };
  stationIds[code] = result.lastInsertRowid;
}
console.log(`   ✓ ${stations.length} stations inserted`);

// ============================================================
// TRAINS (fictional train numbers and names)
// ============================================================
const trainInsert = db.prepare(
  'INSERT INTO trains (train_number, name, type) VALUES (?, ?, ?)'
);

const trains = [
  // Scenario 1: CNF seats available (SBC → MAS)
  ['12028', 'KSK Shatabdi Demo Express', 'SUPERFAST'],
  // Scenario 2: WL only (SBC → MYS)
  ['56501', 'SBC MYS Demo Passenger', 'PASSENGER'],
  // Scenario 3: Multiple classes (SBC → HYB)
  ['12027', 'Deccan Demo Intercity SF', 'SUPERFAST'],
  // Scenario 4: Overnight journey (MAS → TVC)
  ['12601', 'Mangala Demo Night Express', 'EXPRESS'],
  // Scenario 5: Second SBC → MAS for cancellation demo
  ['11013', 'Coimbatore Demo Mail', 'EXPRESS'],
];

const trainIds: Record<string, number> = {};
for (const [number, name, type] of trains) {
  const result = trainInsert.run(number, name, type) as { lastInsertRowid: number };
  trainIds[number] = result.lastInsertRowid;
}
console.log(`   ✓ ${trains.length} trains inserted`);

// ============================================================
// TRAIN ROUTES
// ============================================================
const routeInsert = db.prepare(`
  INSERT INTO train_routes 
    (train_id, station_id, stop_sequence, arrival_time, departure_time, day_offset, distance_km)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Train 12028: SBC → MAS (367 km, morning)
routeInsert.run(trainIds['12028'], stationIds['SBC'], 1, null, '06:00', 0, 0);
routeInsert.run(trainIds['12028'], stationIds['MAS'], 2, '11:00', null, 0, 367);

// Train 56501: SBC → MYS (139 km)
routeInsert.run(trainIds['56501'], stationIds['SBC'], 1, null, '07:30', 0, 0);
routeInsert.run(trainIds['56501'], stationIds['MYS'], 2, '10:15', null, 0, 139);

// Train 12027: SBC → UBL → HYB
routeInsert.run(trainIds['12027'], stationIds['SBC'], 1, null, '08:15', 0, 0);
routeInsert.run(trainIds['12027'], stationIds['UBL'], 2, '12:30', '12:45', 0, 418);
routeInsert.run(trainIds['12027'], stationIds['HYB'], 3, '18:30', null, 0, 618);

// Train 12601: MAS → TVC (OVERNIGHT - arrives next day)
// Departs 22:15, arrives 08:45 next day
routeInsert.run(trainIds['12601'], stationIds['MAS'], 1, null, '22:15', 0, 0);
routeInsert.run(trainIds['12601'], stationIds['TVC'], 2, '08:45', null, 1, 722);

// Train 11013: SBC → MAS (for cancellation demo)
routeInsert.run(trainIds['11013'], stationIds['SBC'], 1, null, '14:00', 0, 0);
routeInsert.run(trainIds['11013'], stationIds['MAS'], 2, '19:30', null, 0, 367);

console.log('   ✓ Train routes inserted');

// ============================================================
// TRAIN CLASSES
// ============================================================
const classInsert = db.prepare(`
  INSERT INTO train_classes 
    (train_id, class_code, class_name, base_fare, total_seats, max_waiting_list)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// 12028: Shatabdi - CC and 1A
classInsert.run(trainIds['12028'], 'CC', 'Chair Car', 650, 78, 20);
classInsert.run(trainIds['12028'], '1A', 'AC First Class', 2100, 18, 5);

// 56501: Passenger - SL only (will be full for WL demo)
classInsert.run(trainIds['56501'], 'SL', 'Sleeper Class', 145, 72, 15);
classInsert.run(trainIds['56501'], '2S', 'Second Sitting', 65, 120, 30);

// 12027: Multi-class intercity
classInsert.run(trainIds['12027'], '2A', 'AC 2 Tier', 1850, 46, 12);
classInsert.run(trainIds['12027'], '3A', 'AC 3 Tier', 1280, 64, 20);
classInsert.run(trainIds['12027'], 'SL', 'Sleeper Class', 485, 72, 25);

// 12601: Overnight express
classInsert.run(trainIds['12601'], '2A', 'AC 2 Tier', 1920, 46, 12);
classInsert.run(trainIds['12601'], '3A', 'AC 3 Tier', 1350, 64, 20);
classInsert.run(trainIds['12601'], 'SL', 'Sleeper Class', 520, 72, 25);

// 11013: Cancellation demo train
classInsert.run(trainIds['11013'], 'CC', 'Chair Car', 580, 78, 20);
classInsert.run(trainIds['11013'], 'SL', 'Sleeper Class', 320, 72, 25);

console.log('   ✓ Train classes inserted');

// ============================================================
// SCHEDULES (seed for today +7 through +30 days)
// We create a fixed set of schedules around a reference date
// ============================================================
const scheduleInsert = db.prepare(
  'INSERT INTO schedules (train_id, journey_date) VALUES (?, ?)'
);

// Generate dates from today+1 to today+30
const today = new Date();
const scheduleIds: Record<string, Record<string, number>> = {};

function getDateStr(daysAhead: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// Create schedules for the next 30 days for all trains
for (let day = 1; day <= 30; day++) {
  const dateStr = getDateStr(day);
  for (const [trainNumber, trainId] of Object.entries(trainIds)) {
    const result = scheduleInsert.run(trainId, dateStr) as { lastInsertRowid: number };
    if (!scheduleIds[trainNumber]) scheduleIds[trainNumber] = {};
    scheduleIds[trainNumber][dateStr] = result.lastInsertRowid;
  }
}

console.log('   ✓ Schedules inserted (30 days × 5 trains = 150 schedules)');

// ============================================================
// SEAT INVENTORY
// Scenario 1 (12028/CC): 40 available seats → SCENARIO: CNF available
// Scenario 2 (56501/SL): 0 available, 3 WL → SCENARIO: WL only
// Others: normal availability
// ============================================================
const inventoryInsert = db.prepare(`
  INSERT INTO seat_inventory 
    (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const referenceDate = getDateStr(3); // 3 days from now for demos

// 12028 (SBC→MAS): CNF available - 40 of 78 CC seats
for (const [dateStr, schedId] of Object.entries(scheduleIds['12028'])) {
  inventoryInsert.run(schedId, 'CC', 78, 40, 0, 20);
  inventoryInsert.run(schedId, '1A', 18, 10, 0, 5);
}

// 56501 (SBC→MYS): WL scenario - SL full, 3 WL passengers
for (const [dateStr, schedId] of Object.entries(scheduleIds['56501'])) {
  if (dateStr === referenceDate) {
    // Demo scenario: SL fully booked with 3 waiting list
    inventoryInsert.run(schedId, 'SL', 72, 0, 3, 15);
    inventoryInsert.run(schedId, '2S', 120, 45, 0, 30);
  } else {
    inventoryInsert.run(schedId, 'SL', 72, 55, 0, 15);
    inventoryInsert.run(schedId, '2S', 120, 95, 0, 30);
  }
}

// 12027 (SBC→HYB): Multiple classes
for (const [dateStr, schedId] of Object.entries(scheduleIds['12027'])) {
  inventoryInsert.run(schedId, '2A', 46, 18, 0, 12);
  inventoryInsert.run(schedId, '3A', 64, 32, 0, 20);
  inventoryInsert.run(schedId, 'SL', 72, 55, 0, 25);
}

// 12601 (MAS→TVC): Overnight journey
for (const [dateStr, schedId] of Object.entries(scheduleIds['12601'])) {
  inventoryInsert.run(schedId, '2A', 46, 15, 0, 12);
  inventoryInsert.run(schedId, '3A', 64, 40, 0, 20);
  inventoryInsert.run(schedId, 'SL', 72, 60, 0, 25);
}

// 11013 (SBC→MAS): Cancellation demo
for (const [dateStr, schedId] of Object.entries(scheduleIds['11013'])) {
  inventoryInsert.run(schedId, 'CC', 78, 35, 0, 20);
  inventoryInsert.run(schedId, 'SL', 72, 50, 0, 25);
}

console.log('   ✓ Seat inventory seeded');

// ============================================================
// ADMIN USER (bcrypt hashed - cost 10 for demo speed)
// Username: admin | Password: PresidencyAdmin2026!
// NEVER commit real credentials. This is a demo account only.
// ============================================================
const adminPassword = 'PresidencyAdmin2026!';
const passwordHash = bcrypt.hashSync(adminPassword, 10);

db.prepare(`
  INSERT INTO admin_users (username, password_hash, role)
  VALUES (?, ?, ?)
`).run('admin', passwordHash, 'SUPERADMIN');

console.log('   ✓ Admin user created: username=admin, password=PresidencyAdmin2026!');
console.log('   ⚠️  Change this password in production environments.');

// ============================================================
// SEED BOOKING (pre-confirmed for cancellation demo)
// ============================================================
const refSched11013 = scheduleIds['11013'][referenceDate];
if (refSched11013) {
  // Reduce CC inventory by 1 for the seeded booking
  db.prepare(`
    UPDATE seat_inventory 
    SET available_seats = available_seats - 1
    WHERE schedule_id = ? AND class_code = 'CC'
  `).run(refSched11013);

  const demoBooking = db.prepare(`
    INSERT INTO bookings 
      (pnr_number, schedule_id, source_station_id, dest_station_id, 
       journey_date, class_code, total_passengers, total_fare, 
       booking_status, payment_status, contact_email, contact_phone, idempotency_key)
    VALUES (?, ?, ?, ?, ?, 'CC', 1, 640, 'CONFIRMED', 'PAID', 
            'demo.passenger@example.com', '9876543210', 'SEED-DEMO-001')
  `).run(
    'PNR-DEMO01',
    refSched11013,
    stationIds['SBC'],
    stationIds['MAS'],
    referenceDate
  ) as { lastInsertRowid: number };

  db.prepare(`
    INSERT INTO booking_passengers 
      (booking_id, passenger_name, age, gender, berth_preference, allocated_seat, status)
    VALUES (?, 'Raj Kumar (Demo)', 28, 'M', 'ANY', 'CC1-4', 'CONFIRMED')
  `).run(demoBooking.lastInsertRowid);

  db.prepare(`
    INSERT INTO payments (booking_id, transaction_id, amount, status)
    VALUES (?, 'SIM-SEED-TXN-001', 640, 'SUCCESS')
  `).run(demoBooking.lastInsertRowid);

  db.prepare(`
    INSERT INTO audit_logs (event_type, booking_id, description, ip_address)
    VALUES ('BOOKING_CREATED', ?, 'Seed booking created for demonstration', 'SEED')
  `).run(demoBooking.lastInsertRowid);

  console.log('   ✓ Demo booking seeded: PNR=PNR-DEMO01, email=demo.passenger@example.com');
}

// Force WAL checkpoint so data is visible immediately to new connections
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();

console.log('\n✅ Seed data loaded successfully!');
console.log('\n📋 Demo Scenarios Available:');
console.log('   1. Train 12028 (SBC→MAS): CNF seats available');
console.log(`   2. Train 56501 (SBC→MYS) on ${referenceDate}: WL only (SL class)`);
console.log('   3. Train 12027 (SBC→HYB): Multiple classes (2A, 3A, SL)');
console.log('   4. Train 12601 (MAS→TVC): Overnight journey (day_offset=1)');
console.log('   5. PNR-DEMO01 (SBC→MAS): Pre-confirmed booking for cancellation demo');
console.log('\n🔑 Admin Login: username=admin | password=PresidencyAdmin2026!');
