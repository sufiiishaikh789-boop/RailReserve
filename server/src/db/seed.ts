// ============================================================
// Expanded Seed Data v2.0 — Railway Reservation System (Team 11)
// CSE 2271 | Presidency University, Bengaluru
//
// DISCLAIMER: All train numbers, names, schedules, stations, and
// routes are FICTIONAL and created for academic demonstration purposes only.
// This system has no connection to Indian Railways, IRCTC, or any
// official railway operator. Station codes marked (DEMO) are not
// official railway station codes.
//
// Data source: Academic demonstration dataset, created 2026-10
// License: Educational use only
// ============================================================
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

const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('🌱 Seeding expanded demonstration data v2.0 ...');
console.log('   ⚠️  All trains, stations, schedules are FICTIONAL (academic demo only).');

// Clear existing data
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
// STATIONS — 56 fictional demonstration stations
// ============================================================
const stationInsert = db.prepare(
  'INSERT INTO stations (code, name, city, state, region, aliases) VALUES (?, ?, ?, ?, ?, ?)'
);

type StationRow = [string, string, string, string, string, string];
const stationData: StationRow[] = [
  // Karnataka
  ['SBC',  'Bengaluru City Junction (Demo)',     'Bengaluru',      'Karnataka',       'South India',   'bangalore,blr,bang'],
  ['MYS',  'Mysuru Junction (Demo)',             'Mysuru',         'Karnataka',       'South India',   'mysore'],
  ['UBL',  'Hubballi Junction (Demo)',           'Hubballi',       'Karnataka',       'South India',   'hubli,dharwad'],
  ['BGM',  'Belagavi Junction (Demo)',           'Belagavi',       'Karnataka',       'South India',   'belgaum'],
  ['DVG',  'Davangere (Demo)',                   'Davangere',      'Karnataka',       'South India',   'davanagere'],
  ['BRAR', 'Birur Junction (Demo)',              'Birur',          'Karnataka',       'South India',   'birur'],
  ['TK',   'Tumakuru (Demo)',                    'Tumakuru',       'Karnataka',       'South India',   'tumkur'],
  ['ASK',  'Arsikere Junction (Demo)',           'Arsikere',       'Karnataka',       'South India',   ''],
  ['MGR',  'Mangaluru Junction (Demo)',          'Mangaluru',      'Karnataka',       'South India',   'mangalore'],
  ['MAJN', 'Mangaluru Central (Demo)',           'Mangaluru',      'Karnataka',       'South India',   'mangalore central'],
  ['GDG',  'Gadag Junction (Demo)',              'Gadag',          'Karnataka',       'South India',   ''],
  ['BAY',  'Ballari Junction (Demo)',            'Ballari',        'Karnataka',       'South India',   'bellary'],
  ['SSPN', 'Shivamogga Town (Demo)',             'Shivamogga',     'Karnataka',       'South India',   'shimoga'],

  // Tamil Nadu
  ['MAS',  'Chennai Central (Demo)',             'Chennai',        'Tamil Nadu',      'South India',   'madras,chennai central'],
  ['MS',   'Chennai Egmore (Demo)',              'Chennai',        'Tamil Nadu',      'South India',   'egmore,madras egmore'],
  ['CBE',  'Coimbatore Junction (Demo)',         'Coimbatore',     'Tamil Nadu',      'South India',   'kovai'],
  ['MDU',  'Madurai Junction (Demo)',            'Madurai',        'Tamil Nadu',      'South India',   ''],
  ['TEN',  'Tirunelveli Junction (Demo)',        'Tirunelveli',    'Tamil Nadu',      'South India',   'nellai,tirunelveli'],
  ['TPJ',  'Tiruchirappalli Junction (Demo)',    'Tiruchirappalli','Tamil Nadu',      'South India',   'trichy,trichirappalli'],
  ['SA',   'Salem Junction (Demo)',              'Salem',          'Tamil Nadu',      'South India',   ''],
  ['ED',   'Erode Junction (Demo)',              'Erode',          'Tamil Nadu',      'South India',   ''],
  ['PON',  'Puducherry (Demo)',                  'Puducherry',     'Puducherry',      'South India',   'pondicherry'],

  // Kerala
  ['TVC',  'Thiruvananthapuram Central (Demo)', 'Thiruvananthapuram','Kerala',       'South India',   'trivandrum,tvm'],
  ['ERS',  'Ernakulam Junction (Demo)',          'Kochi',          'Kerala',          'South India',   'cochin,kochi,ernakulam'],
  ['SRR',  'Shoranur Junction (Demo)',           'Shoranur',       'Kerala',          'South India',   ''],
  ['CLT',  'Kozhikode (Demo)',                   'Kozhikode',      'Kerala',          'South India',   'calicut'],
  ['CAN',  'Kannur (Demo)',                      'Kannur',         'Kerala',          'South India',   'cannanore'],
  ['QLN',  'Kollam Junction (Demo)',             'Kollam',         'Kerala',          'South India',   'quilon'],
  ['ALLP', 'Alappuzha (Demo)',                   'Alappuzha',      'Kerala',          'South India',   'alleppey'],
  ['TCR',  'Thrissur (Demo)',                    'Thrissur',       'Kerala',          'South India',   'trichur'],
  ['PGT',  'Palakkad Junction (Demo)',           'Palakkad',       'Kerala',          'South India',   'palghat'],

  // Andhra Pradesh & Telangana
  ['SC',   'Secunderabad Junction (Demo)',       'Hyderabad',      'Telangana',       'South India',   'secundrabad,sec'],
  ['HYB',  'Hyderabad Deccan (Demo)',            'Hyderabad',      'Telangana',       'South India',   'nampally'],
  ['GTL',  'Guntakal Junction (Demo)',           'Guntakal',       'Andhra Pradesh',  'South India',   ''],
  ['VSKP', 'Visakhapatnam (Demo)',               'Visakhapatnam',  'Andhra Pradesh',  'South India',   'vizag,waltair'],
  ['BZA',  'Vijayawada Junction (Demo)',         'Vijayawada',     'Andhra Pradesh',  'South India',   ''],
  ['GNT',  'Guntur Junction (Demo)',             'Guntur',         'Andhra Pradesh',  'South India',   ''],
  ['TPTY', 'Tirupati (Demo)',                    'Tirupati',       'Andhra Pradesh',  'South India',   ''],
  ['RJY',  'Rajahmundry (Demo)',                 'Rajahmundry',    'Andhra Pradesh',  'South India',   'rajamahendravaram'],

  // Maharashtra & Goa
  ['CSTM', 'Chhatrapati Shivaji Terminus (Demo)','Mumbai',         'Maharashtra',     'West India',    'cst,vt,bombay'],
  ['LTT',  'Mumbai LTT (Demo)',                 'Mumbai',          'Maharashtra',     'West India',    'lokmanya tilak,kurla'],
  ['PUNE', 'Pune Junction (Demo)',              'Pune',            'Maharashtra',     'West India',    'poona'],
  ['NGP',  'Nagpur Junction (Demo)',            'Nagpur',          'Maharashtra',     'West India',    ''],
  ['SUR',  'Solapur Junction (Demo)',           'Solapur',         'Maharashtra',     'West India',    'sholapur'],
  ['MAO',  'Madgaon Junction (Demo)',           'Margao',          'Goa',             'West India',    'margao,goa,madgaon'],

  // North India
  ['NDLS', 'New Delhi (Demo)',                  'New Delhi',       'Delhi',           'North India',   'delhi,ndls'],
  ['HWH',  'Howrah Junction (Demo)',            'Kolkata',         'West Bengal',     'East India',    'kolkata,calcutta,howrah'],
  ['BPL',  'Bhopal Junction (Demo)',            'Bhopal',          'Madhya Pradesh',  'Central India', ''],
  ['JP',   'Jaipur Junction (Demo)',            'Jaipur',          'Rajasthan',       'North India',   'jaipur'],
  ['PNBE', 'Patna Junction (Demo)',             'Patna',           'Bihar',           'East India',    ''],
  ['CNB',  'Kanpur Central (Demo)',             'Kanpur',          'Uttar Pradesh',   'North India',   'cawnpore'],
  ['LKO',  'Lucknow Charbagh (Demo)',           'Lucknow',         'Uttar Pradesh',   'North India',   'lucknow'],
  ['BBS',  'Bhubaneswar (Demo)',                'Bhubaneswar',     'Odisha',          'East India',    ''],
  ['ADI',  'Ahmedabad Junction (Demo)',         'Ahmedabad',       'Gujarat',         'West India',    ''],
  ['STV',  'Surat (Demo)',                      'Surat',           'Gujarat',         'West India',    ''],
];

const stationIds: Record<string, number> = {};
for (const [code, name, city, state, region, aliases] of stationData) {
  const r = stationInsert.run(code, name, city, state, region, aliases) as { lastInsertRowid: number };
  stationIds[code] = r.lastInsertRowid;
}
console.log(`   ✓ ${stationData.length} stations inserted`);

// ============================================================
// TRAINS — 22 fictional demonstration trains
// ============================================================
const trainInsert = db.prepare('INSERT INTO trains (train_number, name, type) VALUES (?, ?, ?)');
type TrainRow = [string, string, string];
const trainData: TrainRow[] = [
  // South India corridor
  ['D0001', 'Demo Rajdhani Superfast Express',      'SUPERFAST'],  // SBC→NDLS
  ['D0002', 'Demo Shatabdi Chair Car Express',      'SUPERFAST'],  // SBC→MAS
  ['D0003', 'Demo Intercity Express',               'EXPRESS'],    // SBC→CBE via MYS
  ['D0004', 'Demo Janshatabdi Express',             'SUPERFAST'],  // SBC→MYS (Mysuru shuttle)
  ['D0005', 'Demo Passenger Local',                 'PASSENGER'],  // SBC→TK (short WL demo)
  ['D0006', 'Demo Night Express North',             'SUPERFAST'],  // SBC→HYB
  ['D0007', 'Demo Garib Rath Express',              'EXPRESS'],    // MAS→TVC (overnight)
  ['D0008', 'Demo Coastal Express',                 'EXPRESS'],    // MAS→VSKP coastal
  ['D0009', 'Demo Tamil Nadu SF Express',           'SUPERFAST'],  // MAS→NDLS
  ['D0010', 'Demo Lalbagh Express',                 'EXPRESS'],    // SBC→MAS via TPJ
  ['D0011', 'Demo Mangala Express',                 'EXPRESS'],    // TVC→NDLS (super-long overnight)
  ['D0012', 'Demo Konkan Kanya Express',            'EXPRESS'],    // CSTM→MAO
  ['D0013', 'Demo Deccan Queen Express',            'SUPERFAST'],  // PUNE→CSTM
  ['D0014', 'Demo Hubballi Express',                'EXPRESS'],    // SBC→UBL→BGM
  ['D0015', 'Demo Vishakapatnam Express',           'EXPRESS'],    // HYB→VSKP
  ['D0016', 'Demo Kerala Express',                  'SUPERFAST'],  // NDLS→TVC
  ['D0017', 'Demo Coromandel Express',              'SUPERFAST'],  // MAS→HWH coastal
  ['D0018', 'Demo Mysore-Chennai SF',               'SUPERFAST'],  // MYS→MAS
  ['D0019', 'Demo Ernakulam Express',               'EXPRESS'],    // ERS→NDLS
  ['D0020', 'Demo Tirupati Express',                'EXPRESS'],    // MAS→TPTY
  ['D0021', 'Demo Mangaluru Mail',                  'MAIL'],       // MAS→MGR
  ['D0022', 'Demo Pune-Bengaluru Express',          'EXPRESS'],    // PUNE→SBC via SUR,GTL
];

const trainIds: Record<string, number> = {};
for (const [number, name, type] of trainData) {
  const r = trainInsert.run(number, name, type) as { lastInsertRowid: number };
  trainIds[number] = r.lastInsertRowid;
}
console.log(`   ✓ ${trainData.length} trains inserted`);

// ============================================================
// TRAIN ROUTES — multi-stop routes for each train
// ============================================================
const routeInsert = db.prepare(`
  INSERT INTO train_routes
    (train_id, station_id, stop_sequence, arrival_time, departure_time, day_offset, distance_km)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const addStops = (trainNum: string, stops: [string, string|null, string|null, number, number][]) => {
  const tid = trainIds[trainNum];
  stops.forEach(([code, arr, dep, dayOff, km], i) => {
    routeInsert.run(tid, stationIds[code], i + 1, arr, dep, dayOff, km);
  });
};

// D0001: SBC → DVG → UBL → SUR → PUNE → CSTM → BPL → CNB → LKO → NDLS
addStops('D0001', [
  ['SBC',  null,    '06:00', 0,    0],
  ['TK',   '06:58', '07:00', 0,   65],
  ['DVG',  '09:30', '09:35', 0,  263],
  ['UBL',  '12:00', '12:15', 0,  418],
  ['BGM',  '14:00', '14:05', 0,  511],
  ['SUR',  '17:00', '17:10', 0,  634],
  ['PUNE', '21:00', '21:20', 0,  795],
  ['CSTM', '23:45', '23:59', 0,  995],
  ['NGP',  '08:00', '08:10', 1, 1368],
  ['BPL',  '14:00', '14:10', 1, 1705],
  ['CNB',  '21:30', '21:40', 1, 2064],
  ['LKO',  '23:30', '23:45', 1, 2141],
  ['NDLS', '07:00', null,    2, 2530],
]);

// D0002: SBC → TK → SA → MAS (chair car express, morning)
addStops('D0002', [
  ['SBC',  null,    '06:00', 0,   0],
  ['TK',   '06:55', '06:57', 0,  65],
  ['SA',   '09:15', '09:20', 0, 201],
  ['MAS',  '11:15', null,    0, 362],
]);

// D0003: SBC → MYS → CBE (intercity via Mysuru)
addStops('D0003', [
  ['SBC',  null,    '07:00', 0,   0],
  ['MYS',  '09:30', '09:40', 0, 139],
  ['SA',   '13:00', '13:10', 0, 350],
  ['ED',   '14:30', '14:35', 0, 424],
  ['CBE',  '16:00', null,    0, 508],
]);

// D0004: SBC → ASK → MYS (fast shuttle)
addStops('D0004', [
  ['SBC',  null,    '06:15', 0,   0],
  ['ASK',  '08:00', '08:02', 0, 104],
  ['MYS',  '09:15', null,    0, 139],
]);

// D0005: SBC → TK (short passenger — WL demo)
addStops('D0005', [
  ['SBC',  null,    '08:30', 0,  0],
  ['TK',   '10:00', null,    0, 65],
]);

// D0006: SBC → HYB (night express)
addStops('D0006', [
  ['SBC',  null,    '20:00', 0,   0],
  ['DVG',  '22:30', '22:35', 0, 263],
  ['BAY',  '01:30', '01:35', 1, 402],
  ['GTL',  '03:00', '03:05', 1, 498],
  ['SC',   '07:45', '07:50', 1, 772],
  ['HYB',  '08:00', null,    1, 778],
]);

// D0007: MAS → QLN → TVC (overnight coastal Kerala)
addStops('D0007', [
  ['MAS',  null,    '18:00', 0,   0],
  ['MS',   '18:20', '18:25', 0,   5],
  ['PON',  '20:30', '20:35', 0, 162],
  ['CBE',  '22:45', '22:55', 0, 511],
  ['PGT',  '00:30', '00:35', 1, 577],
  ['SRR',  '01:45', '01:50', 1, 630],
  ['TCR',  '02:45', '02:50', 1, 682],
  ['ERS',  '04:00', '04:10', 1, 741],
  ['ALLP', '05:10', '05:15', 1, 800],
  ['QLN',  '06:30', '06:35', 1, 859],
  ['TVC',  '08:00', null,    1, 931],
]);

// D0008: MAS → BZA → GNT → RJY → VSKP (coastal express)
addStops('D0008', [
  ['MAS',  null,    '07:00', 0,   0],
  ['MS',   '07:20', '07:25', 0,   5],
  ['TPTY', '10:30', '10:35', 0, 138],
  ['GNT',  '14:00', '14:05', 0, 446],
  ['BZA',  '15:30', '15:40', 0, 434],
  ['RJY',  '18:00', '18:05', 0, 564],
  ['VSKP', '21:45', null,    0, 789],
]);

// D0009: MAS → BZA → NGP → BPL → CNB → NDLS (Tamil Nadu SF)
addStops('D0009', [
  ['MAS',  null,    '22:00', 0,    0],
  ['BZA',  '02:30', '02:40', 1,  434],
  ['NGP',  '11:00', '11:15', 1,  1074],
  ['BPL',  '17:30', '17:40', 1,  1411],
  ['CNB',  '01:00', '01:10', 2,  1770],
  ['NDLS', '09:30', null,    2,  2187],
]);

// D0010: SBC → SA → TPJ → MDU → MAS (via central TN)
addStops('D0010', [
  ['SBC',  null,    '08:00', 0,   0],
  ['SA',   '11:00', '11:10', 0, 201],
  ['ED',   '12:30', '12:35', 0, 275],
  ['TPJ',  '15:00', '15:10', 0, 461],
  ['MDU',  '17:30', '17:40', 0, 581],
  ['TEN',  '20:00', '20:10', 0, 702],
  ['MAS',  '04:00', null,    1, 952],
]);

// D0011: TVC → ERS → SRR → MAO → PUNE → CSTM → NGP → NDLS (super-long overnight)
addStops('D0011', [
  ['TVC',  null,    '11:00', 0,    0],
  ['QLN',  '12:00', '12:05', 0,   72],
  ['ERS',  '14:30', '14:40', 0,  190],
  ['TCR',  '16:00', '16:05', 0,  249],
  ['SRR',  '17:00', '17:05', 0,  301],
  ['CLT',  '19:00', '19:10', 0,  390],
  ['CAN',  '21:00', '21:05', 0,  476],
  ['MAJN', '23:00', '23:10', 0,  564],
  ['MAO',  '02:00', '02:15', 1,  745],
  ['PUNE', '08:30', '08:45', 1,  1139],
  ['CSTM', '11:00', '11:30', 1,  1339],
  ['NGP',  '22:00', '22:15', 1,  1712],
  ['BPL',  '04:00', '04:10', 2,  2049],
  ['NDLS', '16:30', null,    2,  2790],
]);

// D0012: CSTM → SUR → MAO (Konkan Kanya)
addStops('D0012', [
  ['CSTM', null,    '23:10', 0,   0],
  ['SUR',  '04:00', '04:10', 1, 451],
  ['MAO',  '12:30', null,    1, 593],
]);

// D0013: PUNE → CSTM (Deccan Queen SF)
addStops('D0013', [
  ['PUNE', null,    '07:15', 0,   0],
  ['CSTM', '10:30', null,    0, 192],
]);

// D0014: SBC → DVG → UBL → BGM (Hubballi Express)
addStops('D0014', [
  ['SBC',  null,    '17:00', 0,   0],
  ['DVG',  '20:00', '20:05', 0, 263],
  ['UBL',  '22:30', '22:40', 0, 418],
  ['GDG',  '23:45', '23:50', 0, 506],
  ['BGM',  '01:30', null,    1, 511],
]);

// D0015: HYB → VSKP (Visakhapatnam Express)
addStops('D0015', [
  ['HYB',  null,    '06:00', 0,   0],
  ['SC',   '06:15', '06:20', 0,  10],
  ['VSKP', '17:00', null,    0, 622],
]);

// D0016: NDLS → LKO → CNB → BPL → NGP → SC → MAS → ERS → TVC (Kerala Express)
addStops('D0016', [
  ['NDLS', null,    '11:00', 0,    0],
  ['CNB',  '18:00', '18:10', 0,  447],
  ['LKO',  '20:00', '20:15', 0,  524],
  ['BPL',  '02:30', '02:40', 1,  909],
  ['NGP',  '10:00', '10:15', 1, 1246],
  ['SC',   '22:00', '22:15', 1, 1696],
  ['MAS',  '08:00', '08:30', 2, 2218],
  ['ERS',  '19:00', '19:15', 2, 2977],
  ['TVC',  '22:30', null,    2, 3164],
]);

// D0017: MAS → BZA → VSKP → BBS → HWH (Coromandel Express)
addStops('D0017', [
  ['MAS',  null,    '09:00', 0,    0],
  ['BZA',  '13:30', '13:40', 0,  434],
  ['VSKP', '19:00', '19:10', 0,  789],
  ['BBS',  '01:00', '01:10', 1, 1126],
  ['HWH',  '09:00', null,    1, 1663],
]);

// D0018: MYS → SA → MAS (Mysore-Chennai SF)
addStops('D0018', [
  ['MYS',  null,    '14:00', 0,   0],
  ['SBC',  '16:30', '16:45', 0, 139],
  ['SA',   '19:30', '19:35', 0, 340],
  ['MAS',  '22:30', null,    0, 501],
]);

// D0019: ERS → SRR → CLT → CAN → MAJN → MAO → PUNE → NGP → NDLS
addStops('D0019', [
  ['ERS',  null,    '19:00', 0,    0],
  ['SRR',  '20:30', '20:35', 0,   59],
  ['CLT',  '22:00', '22:10', 0,  148],
  ['CAN',  '00:00', '00:05', 1,  234],
  ['MAJN', '02:00', '02:10', 1,  322],
  ['MAO',  '05:00', '05:15', 1,  503],
  ['PUNE', '12:00', '12:20', 1,  897],
  ['NGP',  '23:00', '23:15', 1, 1299],
  ['BPL',  '05:30', '05:40', 2, 1636],
  ['NDLS', '17:00', null,    2, 2377],
]);

// D0020: MAS → TPTY (Tirupati Express)
addStops('D0020', [
  ['MAS',  null,    '06:00', 0,   0],
  ['MS',   '06:20', '06:25', 0,   5],
  ['TPTY', '09:30', null,    0, 138],
]);

// D0021: MAS → CBE → PGT → CLT → MGR (Mangaluru Mail)
addStops('D0021', [
  ['MAS',  null,    '20:00', 0,   0],
  ['SA',   '22:30', '22:35', 0, 201],
  ['ED',   '23:45', '23:50', 0, 275],
  ['CBE',  '01:00', '01:10', 1, 511],
  ['PGT',  '02:00', '02:05', 1, 577],
  ['SRR',  '03:00', '03:05', 1, 630],
  ['CLT',  '04:30', '04:35', 1, 719],
  ['CAN',  '06:15', '06:20', 1, 805],
  ['MAJN', '08:00', '08:10', 1, 893],
  ['MGR',  '09:00', null,    1, 931],
]);

// D0022: PUNE → SUR → GTL → BAY → SBC (Pune-Bengaluru Express)
addStops('D0022', [
  ['PUNE', null,    '21:00', 0,   0],
  ['SUR',  '23:30', '23:40', 0, 244],
  ['GTL',  '04:00', '04:10', 1, 466],
  ['BAY',  '06:00', '06:05', 1, 562],
  ['DVG',  '08:30', '08:35', 1, 679],
  ['SBC',  '11:30', null,    1, 942],
]);

console.log('   ✓ Train routes inserted');

// ============================================================
// TRAIN CLASSES — fares per train
// ============================================================
const classInsert = db.prepare(`
  INSERT INTO train_classes (train_id, class_code, class_name, base_fare, total_seats, max_waiting_list)
  VALUES (?, ?, ?, ?, ?, ?)
`);

type ClassRow = [string, string, string, number, number, number];
const classData: ClassRow[] = [
  // D0001 Rajdhani: 1A, 2A, 3A
  ['D0001', '1A',  'First AC',             4200, 18,  5],
  ['D0001', '2A',  'Second AC',            2450, 54, 10],
  ['D0001', '3A',  'Third AC',             1700, 72, 15],

  // D0002 Shatabdi: CC, 1A
  ['D0002', 'CC',  'Chair Car',             650, 78, 20],
  ['D0002', '1A',  'First AC',            1250, 24, 10],

  // D0003 Intercity: CC, 2S
  ['D0003', 'CC',  'Chair Car',             480, 96, 25],
  ['D0003', '2S',  'Second Sitting',        220, 110, 30],

  // D0004 Janshatabdi: CC, 2S
  ['D0004', 'CC',  'Chair Car',             350, 96, 20],
  ['D0004', '2S',  'Second Sitting',        145, 120, 30],

  // D0005 Passenger: 2S only (WL demo — limited seats)
  ['D0005', '2S',  'Second Sitting',         75,  2,  5],

  // D0006 Hyderabad Night: 2A, 3A, SL
  ['D0006', '2A',  'Second AC',            1100, 54, 10],
  ['D0006', '3A',  'Third AC',              780, 72, 15],
  ['D0006', 'SL',  'Sleeper',              320, 144, 30],

  // D0007 Kerala Express: 1A, 2A, 3A, SL
  ['D0007', '1A',  'First AC',            2100, 18,  5],
  ['D0007', '2A',  'Second AC',           1250, 54, 10],
  ['D0007', '3A',  'Third AC',             880, 72, 15],
  ['D0007', 'SL',  'Sleeper',             380, 144, 30],

  // D0008 Coastal Express: 2A, 3A, SL
  ['D0008', '2A',  'Second AC',            900, 54, 10],
  ['D0008', '3A',  'Third AC',             640, 72, 15],
  ['D0008', 'SL',  'Sleeper',             265, 144, 30],

  // D0009 Tamil Nadu SF: 1A, 2A, 3A, SL
  ['D0009', '1A',  'First AC',            3200, 18,  5],
  ['D0009', '2A',  'Second AC',           1890, 54, 10],
  ['D0009', '3A',  'Third AC',            1310, 72, 15],
  ['D0009', 'SL',  'Sleeper',             490, 144, 30],

  // D0010 Lalbagh: 1A, 2A, 3A, SL
  ['D0010', '2A',  'Second AC',            980, 54, 10],
  ['D0010', '3A',  'Third AC',             690, 72, 15],
  ['D0010', 'SL',  'Sleeper',             280, 144, 30],

  // D0011 Mangala: 1A, 2A, 3A, SL
  ['D0011', '1A',  'First AC',            4800, 18,  5],
  ['D0011', '2A',  'Second AC',           2800, 54, 10],
  ['D0011', '3A',  'Third AC',            1950, 72, 15],
  ['D0011', 'SL',  'Sleeper',             720, 144, 30],

  // D0012 Konkan: 2A, 3A, SL
  ['D0012', '2A',  'Second AC',            650, 54, 10],
  ['D0012', '3A',  'Third AC',             450, 72, 15],
  ['D0012', 'SL',  'Sleeper',             195, 144, 25],

  // D0013 Deccan Queen: CC
  ['D0013', 'CC',  'Chair Car',             290, 78, 15],
  ['D0013', '1A',  'First AC',             680, 24, 10],

  // D0014 Hubballi: 2A, 3A, SL
  ['D0014', '2A',  'Second AC',            680, 54, 10],
  ['D0014', '3A',  'Third AC',             480, 72, 15],
  ['D0014', 'SL',  'Sleeper',             195, 144, 25],

  // D0015 Visakhapatnam: 2A, 3A, SL
  ['D0015', '2A',  'Second AC',            780, 54, 10],
  ['D0015', '3A',  'Third AC',             540, 72, 15],
  ['D0015', 'SL',  'Sleeper',             220, 144, 25],

  // D0016 Kerala Express: 1A, 2A, 3A, SL
  ['D0016', '1A',  'First AC',            4500, 18,  5],
  ['D0016', '2A',  'Second AC',           2650, 54, 10],
  ['D0016', '3A',  'Third AC',            1850, 72, 15],
  ['D0016', 'SL',  'Sleeper',             680, 144, 30],

  // D0017 Coromandel: 1A, 2A, 3A, SL
  ['D0017', '1A',  'First AC',            2800, 18,  5],
  ['D0017', '2A',  'Second AC',           1650, 54, 10],
  ['D0017', '3A',  'Third AC',            1150, 72, 15],
  ['D0017', 'SL',  'Sleeper',             420, 144, 30],

  // D0018 Mysore-Chennai: CC, 2A
  ['D0018', 'CC',  'Chair Car',            480, 78, 15],
  ['D0018', '2A',  'Second AC',            980, 54, 10],

  // D0019 Ernakulam Express: 1A, 2A, 3A, SL
  ['D0019', '1A',  'First AC',            4200, 18,  5],
  ['D0019', '2A',  'Second AC',           2450, 54, 10],
  ['D0019', '3A',  'Third AC',            1700, 72, 15],
  ['D0019', 'SL',  'Sleeper',             630, 144, 30],

  // D0020 Tirupati Express: CC, 2S
  ['D0020', 'CC',  'Chair Car',            280, 78, 15],
  ['D0020', '2S',  'Second Sitting',       120, 120, 25],

  // D0021 Mangaluru Mail: 2A, 3A, SL
  ['D0021', '2A',  'Second AC',            920, 54, 10],
  ['D0021', '3A',  'Third AC',             640, 72, 15],
  ['D0021', 'SL',  'Sleeper',             260, 144, 25],

  // D0022 Pune-Bengaluru: 2A, 3A, SL
  ['D0022', '2A',  'Second AC',            850, 54, 10],
  ['D0022', '3A',  'Third AC',             590, 72, 15],
  ['D0022', 'SL',  'Sleeper',             240, 144, 25],
];

for (const [trainNum, code, name, fare, seats, wl] of classData) {
  classInsert.run(trainIds[trainNum], code, name, fare, seats, wl);
}
console.log(`   ✓ ${classData.length} train class records inserted`);

// ============================================================
// SCHEDULES — 35 days for each train
// ============================================================
const scheduleInsert = db.prepare(
  'INSERT OR IGNORE INTO schedules (train_id, journey_date, status) VALUES (?, ?, ?)'
);
const inventoryInsert = db.prepare(`
  INSERT OR IGNORE INTO seat_inventory
    (schedule_id, class_code, total_seats, available_seats, waiting_list_count, max_waiting_list)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const today = new Date();
let schedulesCreated = 0;

// Helper to get a date string offset from today
const futureDate = (daysFromToday: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
};

// Determine class data per train for quick lookup
const classByTrain: Record<string, { code: string; seats: number; wl: number }[]> = {};
for (const [trainNum, code, , , seats, wl] of classData) {
  if (!classByTrain[trainNum]) classByTrain[trainNum] = [];
  classByTrain[trainNum].push({ code, seats, wl });
}

// Seat availability scenarios keyed by (dayOffset % 7)
// Returns { available, wlCount } based on scenario
const getAvailability = (code: string, totalSeats: number, maxWl: number, dayOffset: number): { avail: number; wl: number } => {
  const mod = dayOffset % 7;
  // Scenario A (mod 0,1,2): plenty of seats
  if (mod <= 2) return { avail: Math.max(1, Math.floor(totalSeats * 0.7)), wl: 0 };
  // Scenario B (mod 3): limited seats
  if (mod === 3) return { avail: Math.max(1, Math.floor(totalSeats * 0.15)), wl: 0 };
  // Scenario C (mod 4): last few seats
  if (mod === 4) return { avail: Math.min(3, totalSeats), wl: 0 };
  // Scenario D (mod 5): waiting list (no confirmed seats)
  if (mod === 5) return { avail: 0, wl: Math.min(Math.floor(maxWl * 0.5), maxWl) };
  // Scenario E (mod 6): fully sold out including WL (only for D0005 special demo)
  return { avail: 0, wl: maxWl };
};

// Generate schedules for the next 35 days for every train
for (let day = 1; day <= 35; day++) {
  const journeyDate = futureDate(day);
  for (const [trainNum] of trainData) {
    const tid = trainIds[trainNum];
    const schedResult = scheduleInsert.run(tid, journeyDate, 'SCHEDULED') as { lastInsertRowid: number; changes: number };
    if (schedResult.changes === 0) continue;
    schedulesCreated++;
    const schedId = schedResult.lastInsertRowid;

    for (const cls of classByTrain[trainNum] || []) {
      // D0005 is always in WL for demo purposes (short hop, tiny capacity)
      let avail = cls.seats;
      let wl = 0;
      if (trainNum === 'D0005') {
        avail = 0;
        wl = Math.floor(cls.wl / 2);
      } else {
        const a = getAvailability(cls.code, cls.seats, cls.wl, day);
        avail = a.avail;
        wl = a.wl;
      }
      inventoryInsert.run(schedId, cls.code, cls.seats, avail, wl, cls.wl);
    }
  }
}
console.log(`   ✓ ${schedulesCreated} schedules created (35 days × ${trainData.length} trains)`);

// ============================================================
// ADMIN USER
// ============================================================
const adminPwd = await bcrypt.hash('PresidencyAdmin2026!', 10);
db.prepare('INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', adminPwd, 'SUPERADMIN');
console.log('   ✓ Admin user created: username=admin, password=PresidencyAdmin2026!');

// ============================================================
// DEMO BOOKING — pre-confirmed for cancellation demo
// ============================================================
const demoDate = futureDate(10);
const demoSchedule = db.prepare(`
  SELECT s.id FROM schedules s JOIN trains t ON t.id = s.train_id
  WHERE t.train_number = 'D0002' AND s.journey_date = ?
`).get(demoDate) as { id: number } | undefined;

if (demoSchedule) {
  const srcId = stationIds['SBC'];
  const dstId = stationIds['MAS'];
  const demoBooking = db.prepare(`
    INSERT INTO bookings
      (pnr_number, schedule_id, source_station_id, dest_station_id, journey_date,
       class_code, total_passengers, total_fare, booking_status, payment_status,
       contact_email, contact_phone, idempotency_key)
    VALUES
      ('PNR-DEMO01', ?, ?, ?, ?, 'CC', 1, 755, 'CONFIRMED', 'PAID',
       'demo.passenger@example.com', '9876543210', 'SEED-DEMO-001')
  `).run(demoSchedule.id, srcId, dstId, demoDate) as { lastInsertRowid: number };

  db.prepare(`
    INSERT INTO booking_passengers
      (booking_id, passenger_name, age, gender, berth_preference, allocated_seat, status)
    VALUES (?, 'Demo Passenger', 28, 'M', 'ANY', 'C1-23', 'CONFIRMED')
  `).run(demoBooking.lastInsertRowid);

  db.prepare(`
    INSERT INTO payments
      (booking_id, transaction_id, amount, payment_method, status)
    VALUES (?, 'SIM-DEMO-TXN-0001', 755, 'SIM', 'SUCCESS')
  `).run(demoBooking.lastInsertRowid);

  // Decrement inventory
  db.prepare(`
    UPDATE seat_inventory SET available_seats = available_seats - 1
    WHERE schedule_id = ? AND class_code = 'CC' AND available_seats > 0
  `).run(demoSchedule.id);

  console.log(`   ✓ Demo booking seeded: PNR=PNR-DEMO01, email=demo.passenger@example.com`);
}

// Force WAL checkpoint so data is immediately visible to new connections
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();

console.log('\n✅ Seed v2.0 complete!');
console.log('\n📋 Dataset Summary:');
console.log(`   Stations : ${stationData.length} (Karnataka, TN, Kerala, AP/TS, MH, North India)`);
console.log(`   Trains   : ${trainData.length} (SUPERFAST, EXPRESS, PASSENGER, MAIL)`);
console.log(`   Classes  : ${classData.length} records (1A, 2A, 3A, SL, CC, 2S)`);
console.log(`   Schedules: ${schedulesCreated} (35 days × ${trainData.length} trains)`);
console.log('\n📋 Demo Scenarios:');
console.log('   1. D0002 SBC→MAS: Chair Car + 1A available — standard booking');
console.log('   2. D0005 SBC→TK: 2S only — always in WL for WL demo');
console.log('   3. D0006 SBC→HYB: 3-class overnight express');
console.log('   4. D0007 MAS→TVC: Overnight 11-stop Kerala journey');
console.log('   5. D0001 SBC→NDLS: Long-distance Rajdhani 13 stops');
console.log('   6. PNR-DEMO01: Pre-confirmed SBC→MAS for cancellation demo');
console.log('\n🔑 Admin: username=admin | password=PresidencyAdmin2026!');
