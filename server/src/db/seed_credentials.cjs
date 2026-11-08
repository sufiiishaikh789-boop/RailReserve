const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/railway.db');
const db = new DatabaseSync(dbPath);

const passengerPassword = 'Passenger@123';
const adminPassword = 'Admin@1234';

const passengerHash = bcrypt.hashSync(passengerPassword, 10);
const adminHash = bcrypt.hashSync(adminPassword, 10);

// Seed/Update passenger.demo@railreserve.in
const existingDemo = db.prepare('SELECT id FROM passenger_users WHERE email = ?').get('passenger.demo@railreserve.in');
let demoUserId;
if (existingDemo) {
  demoUserId = existingDemo.id;
  db.prepare('UPDATE passenger_users SET password_hash = ?, full_name = ?, phone = ? WHERE id = ?')
    .run(passengerHash, 'Demo Passenger', '9876543210', demoUserId);
} else {
  const res = db.prepare('INSERT INTO passenger_users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run('Demo Passenger', 'passenger.demo@railreserve.in', '9876543210', passengerHash);
  demoUserId = Number(res.lastInsertRowid);
}

// Seed/Update rahul.sharma@example.com
const existingRahul = db.prepare('SELECT id FROM passenger_users WHERE email = ?').get('rahul.sharma@example.com');
let rahulUserId;
if (existingRahul) {
  rahulUserId = existingRahul.id;
  db.prepare('UPDATE passenger_users SET password_hash = ? WHERE id = ?')
    .run(passengerHash, rahulUserId);
} else {
  const res = db.prepare('INSERT INTO passenger_users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run('Rahul Sharma', 'rahul.sharma@example.com', '9876543210', passengerHash);
  rahulUserId = Number(res.lastInsertRowid);
}

// Seed/Update admin user
const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (existingAdmin) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(adminHash, existingAdmin.id);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', adminHash, 'SUPERADMIN');
}

// Assign booking PNR-DEMO01 to demo user
const demoBooking = db.prepare("SELECT id FROM bookings WHERE pnr_number = 'PNR-DEMO01'").get();
if (demoBooking && demoUserId) {
  db.prepare('INSERT OR REPLACE INTO booking_ownership (booking_id, user_id) VALUES (?, ?)')
    .run(demoBooking.id, demoUserId);
}

db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();

console.log('✅ Successfully seeded and verified credentials in railway.db!');
