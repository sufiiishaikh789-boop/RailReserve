// Train Repository — data access layer for train search and schedule queries
import { getDatabase } from '../db/database.js';
import type {
  Station,
  TrainSearchResult,
  ClassAvailability,
  ClassCode,
  CLASS_NAMES,
} from '../types/index.js';

interface RouteRow {
  schedule_id: number;
  train_id: number;
  train_number: string;
  train_name: string;
  train_type: string;
  source_station_id: number;
  source_code: string;
  source_name: string;
  dest_station_id: number;
  dest_code: string;
  dest_name: string;
  dep_time: string | null;
  arr_time: string | null;
  dep_day_offset: number;
  arr_day_offset: number;
  distance_km: number;
  journey_date: string;
}

interface InventoryRow {
  class_code: ClassCode;
  class_name: string;
  base_fare: number;
  total_seats: number;
  available_seats: number;
  waiting_list_count: number;
  max_waiting_list: number;
  train_type: string;
}

export class TrainRepository {
  // Find all trains that serve a route (origin → destination in correct sequence order)
  // and have a schedule on the given date
  findTrainsForRoute(fromCode: string, toCode: string, date: string): TrainSearchResult[] {
    const db = getDatabase();

    const sql = `
      SELECT
        s.id        AS schedule_id,
        t.id        AS train_id,
        t.train_number,
        t.name      AS train_name,
        t.type      AS train_type,
        src.id      AS source_station_id,
        src.code    AS source_code,
        src.name    AS source_name,
        dst.id      AS dest_station_id,
        dst.code    AS dest_code,
        dst.name    AS dest_name,
        src_r.departure_time AS dep_time,
        dst_r.arrival_time   AS arr_time,
        src_r.day_offset     AS dep_day_offset,
        dst_r.day_offset     AS arr_day_offset,
        (dst_r.distance_km - src_r.distance_km) AS distance_km,
        s.journey_date
      FROM schedules s
      JOIN trains t ON t.id = s.train_id AND t.active = 1
      JOIN train_routes src_r ON src_r.train_id = t.id
      JOIN stations src ON src.id = src_r.station_id AND src.code = ? COLLATE NOCASE
      JOIN train_routes dst_r ON dst_r.train_id = t.id
      JOIN stations dst ON dst.id = dst_r.station_id AND dst.code = ? COLLATE NOCASE
      WHERE s.journey_date = ?
        AND s.status IN ('SCHEDULED', 'RUNNING')
        AND src_r.stop_sequence < dst_r.stop_sequence
      ORDER BY COALESCE(src_r.departure_time, '00:00')
    `;

    const rows = db.prepare(sql).all(fromCode.toUpperCase(), toCode.toUpperCase(), date) as RouteRow[];

    return rows.map((row) => {
      // Get class availability for this schedule
      const inventoryRows = db.prepare(`
        SELECT 
          tc.class_code,
          tc.class_name,
          tc.base_fare,
          tc.total_seats,
          si.available_seats,
          si.waiting_list_count,
          si.max_waiting_list,
          t.type AS train_type
        FROM seat_inventory si
        JOIN train_classes tc ON tc.train_id = ? AND tc.class_code = si.class_code
        JOIN trains t ON t.id = ?
        WHERE si.schedule_id = ?
        ORDER BY tc.base_fare ASC
      `).all(row.train_id, row.train_id, row.schedule_id) as InventoryRow[];

      const classes: ClassAvailability[] = inventoryRows.map((inv) => {
        // Fare = base_fare + reservation_fee + superfast_surcharge
        const reservationFee = 60;
        const superfastSurcharge = inv.train_type === 'SUPERFAST' ? 45 : 0;
        const totalFare = inv.base_fare + reservationFee + superfastSurcharge;

        let status: ClassAvailability['availability_status'];
        let label: string;

        if (inv.available_seats > 0) {
          status = 'AVAILABLE';
          label = `Available (${inv.available_seats})`;
        } else if (inv.waiting_list_count < inv.max_waiting_list) {
          status = 'WAITING_LIST';
          label = `WL-${inv.waiting_list_count + 1}`;
        } else {
          status = 'NOT_AVAILABLE';
          label = 'REGRET';
        }

        return {
          class_code: inv.class_code,
          class_name: inv.class_name,
          base_fare: inv.base_fare,
          total_fare: Math.round(totalFare * 100) / 100,
          available_seats: inv.available_seats,
          waiting_list_count: inv.waiting_list_count,
          max_waiting_list: inv.max_waiting_list,
          availability_status: status,
          availability_label: label,
        };
      });

      // Calculate journey duration in minutes
      const depTime = row.dep_time || '00:00';
      const arrTime = row.arr_time || '00:00';
      const [depH, depM] = depTime.split(':').map(Number);
      const [arrH, arrM] = arrTime.split(':').map(Number);
      const depMinutes = (row.dep_day_offset || 0) * 1440 + depH * 60 + depM;
      const arrMinutes = (row.arr_day_offset || 0) * 1440 + arrH * 60 + arrM;
      const durationMinutes = arrMinutes - depMinutes;
      const isOvernight = row.arr_day_offset > row.dep_day_offset;

      // Calculate arrival date
      const journeyDateObj = new Date(row.journey_date + 'T00:00:00');
      const arrivalDateObj = new Date(journeyDateObj);
      arrivalDateObj.setDate(arrivalDateObj.getDate() + (row.arr_day_offset || 0));

      return {
        schedule_id: row.schedule_id,
        train_id: row.train_id,
        train_number: row.train_number,
        train_name: row.train_name,
        train_type: row.train_type,
        source_code: row.source_code,
        source_name: row.source_name,
        dest_code: row.dest_code,
        dest_name: row.dest_name,
        departure_time: row.dep_time || 'N/A',
        arrival_time: row.arr_time || 'N/A',
        departure_day_offset: row.dep_day_offset || 0,
        arrival_day_offset: row.arr_day_offset || 0,
        journey_duration_minutes: durationMinutes,
        is_overnight: isOvernight,
        distance_km: row.distance_km || 0,
        journey_date: row.journey_date,
        classes,
      };
    });
  }

  findAllStations(): Station[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM stations ORDER BY name').all() as Station[];
  }

  findStationByCode(code: string): Station | undefined {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM stations WHERE code = ? COLLATE NOCASE')
      .get(code) as Station | undefined;
  }

  findScheduleById(scheduleId: number) {
    const db = getDatabase();
    return db
      .prepare(`
        SELECT s.*, t.train_number, t.name AS train_name, t.type AS train_type
        FROM schedules s
        JOIN trains t ON t.id = s.train_id
        WHERE s.id = ?
      `)
      .get(scheduleId) as (
        { id: number; train_id: number; journey_date: string; status: string;
          train_number: string; train_name: string; train_type: string }
      ) | undefined;
  }

  getInventory(scheduleId: number, classCode: string) {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
      .get(scheduleId, classCode) as import('../types/index.js').SeatInventory | undefined;
  }

  getTrainClassInfo(trainId: number, classCode: string) {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM train_classes WHERE train_id = ? AND class_code = ?')
      .get(trainId, classCode) as import('../types/index.js').TrainClass | undefined;
  }

  getTrainRoute(trainId: number, stationCode: string) {
    const db = getDatabase();
    return db
      .prepare(`
        SELECT tr.* FROM train_routes tr
        JOIN stations s ON s.id = tr.station_id
        WHERE tr.train_id = ? AND s.code = ? COLLATE NOCASE
      `)
      .get(trainId, stationCode) as import('../types/index.js').TrainRoute | undefined;
  }

  // Admin: get all trains
  getAllTrains() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM trains ORDER BY train_number').all() as import('../types/index.js').Train[];
  }
}
