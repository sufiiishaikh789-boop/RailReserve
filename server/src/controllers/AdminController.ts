// Admin Controller — protected routes for train, schedule, and inventory management
import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database.js';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { AppError } from '../middleware/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'demo_railway_secret_change_in_production';
const bookingRepo = new BookingRepository();
const trainRepo = new TrainRepository();

export class AdminController {
  // POST /api/admin/login
  login(req: Request, res: Response, next: NextFunction): void {
    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!username || !password) {
        throw new AppError('Username and password are required', 400);
      }

      const db = getDatabase();
      const admin = db
        .prepare('SELECT * FROM admin_users WHERE username = ?')
        .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

      if (!admin) {
        throw new AppError('Invalid credentials', 401);
      }

      const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
      if (!passwordMatch) {
        // Log failed attempt
        db.prepare(`
          INSERT INTO audit_logs (event_type, description, ip_address)
          VALUES ('ADMIN_LOGIN', ?, ?)
        `).run(`FAILED login attempt for username: ${username}`, req.ip || 'UNKNOWN');

        throw new AppError('Invalid credentials', 401);
      }

      const token = jwt.sign(
        { username: admin.username, role: admin.role, id: admin.id },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Audit successful login
      db.prepare(`
        INSERT INTO audit_logs (event_type, description, ip_address)
        VALUES ('ADMIN_LOGIN', ?, ?)
      `).run(`Successful login: ${username} (${admin.role})`, req.ip || 'UNKNOWN');

      res.json({
        success: true,
        token,
        username: admin.username,
        role: admin.role,
        message: 'Authentication successful',
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/dashboard
  getDashboard(req: Request, res: Response, next: NextFunction): void {
    try {
      const stats = bookingRepo.getSystemStats();
      const trains = trainRepo.getAllTrains();
      const db = getDatabase();
      const recentAuditLogs = db
        .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 20')
        .all() as { id: number; event_type: string; booking_id: number; description: string; timestamp: string }[];

      res.json({
        success: true,
        stats,
        trains: trains.length,
        recent_audit_logs: recentAuditLogs,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/trains
  getTrains(req: Request, res: Response, next: NextFunction): void {
    try {
      const trains = trainRepo.getAllTrains();
      res.json({ success: true, trains });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/admin/inventory/:scheduleId/:classCode
  updateInventory(req: Request, res: Response, next: NextFunction): void {
    try {
      const { scheduleId, classCode } = req.params;
      const { total_seats, max_waiting_list } = req.body as {
        total_seats?: number;
        max_waiting_list?: number;
      };

      if (!scheduleId || !classCode) {
        throw new AppError('Schedule ID and class code are required', 400);
      }

      const db = getDatabase();
      const inventory = db
        .prepare('SELECT * FROM seat_inventory WHERE schedule_id = ? AND class_code = ?')
        .get(Number(scheduleId), classCode);

      if (!inventory) {
        throw new AppError('Inventory record not found', 404);
      }

      const updates: string[] = [];
      const values: (number | string)[] = [];

      if (total_seats !== undefined) {
        updates.push('total_seats = ?', 'available_seats = available_seats + (? - total_seats)');
        values.push(total_seats, total_seats);
      }
      if (max_waiting_list !== undefined) {
        updates.push('max_waiting_list = ?');
        values.push(max_waiting_list);
      }

      if (updates.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      values.push(Number(scheduleId), classCode);

      db.prepare(`
        UPDATE seat_inventory SET ${updates.join(', ')}
        WHERE schedule_id = ? AND class_code = ?
      `).run(...values);

      const adminUser = (req as Request & { adminUser?: { username: string } }).adminUser;
      db.prepare(`
        INSERT INTO audit_logs (event_type, description, ip_address)
        VALUES ('ADMIN_MODIFIED', ?, ?)
      `).run(
        `Inventory updated: Schedule=${scheduleId}, Class=${classCode} by ${adminUser?.username}`,
        req.ip || 'ADMIN'
      );

      res.json({ success: true, message: 'Inventory updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/bookings
  getAllBookings(req: Request, res: Response, next: NextFunction): void {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const bookings = bookingRepo.findAllBookings(limit, offset);
      res.json({ success: true, count: bookings.length, bookings });
    } catch (err) {
      next(err);
    }
  }
}
