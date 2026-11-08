// User Repository — passenger account data access
import { getDatabase } from '../db/database.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

export interface PassengerUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  is_verified: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SavedPassenger {
  id: number;
  user_id: number;
  passenger_name: string;
  age: number;
  gender: string;
  berth_preference: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  booking_id: number | null;
  is_read: number;
  created_at: string;
}

const BCRYPT_ROUNDS = 12;

export class UserRepository {
  // ============================================================
  // REGISTRATION
  // ============================================================
  async createUser(data: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<PassengerUser> {
    const db = getDatabase();

    // Check for duplicate email (case-insensitive)
    const existing = db.prepare('SELECT id FROM passenger_users WHERE email = ? COLLATE NOCASE').get(data.email) as { id: number } | undefined;
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    // Check for duplicate phone
    const existingPhone = db.prepare('SELECT id FROM passenger_users WHERE phone = ?').get(data.phone) as { id: number } | undefined;
    if (existingPhone) {
      throw new Error('An account with this phone number already exists');
    }

    const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const result = db.prepare(`
      INSERT INTO passenger_users (full_name, email, phone, password_hash, is_verified)
      VALUES (?, ?, ?, ?, 1)
    `).run(data.full_name, data.email.toLowerCase().trim(), data.phone.trim(), password_hash) as { lastInsertRowid: number };

    return this.findById(result.lastInsertRowid)!;
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================
  async verifyCredentials(email: string, password: string): Promise<PassengerUser | null> {
    const user = this.findByEmail(email);
    if (!user) return null;
    if (!user.is_active) return null;

    const match = await bcrypt.compare(password, user.password_hash);
    return match ? user : null;
  }

  // ============================================================
  // PROFILE MANAGEMENT
  // ============================================================
  async updateProfile(userId: number, data: {
    full_name?: string;
    phone?: string;
  }): Promise<PassengerUser> {
    const db = getDatabase();
    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const values: (string | number)[] = [];

    if (data.full_name) { updates.push('full_name = ?'); values.push(data.full_name); }
    if (data.phone) { updates.push('phone = ?'); values.push(data.phone); }

    values.push(userId);
    db.prepare(`UPDATE passenger_users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(userId)!;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.findById(userId);
    if (!user) throw new Error('User not found');

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw new Error('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    getDatabase().prepare('UPDATE passenger_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, userId);
  }

  // ============================================================
  // SAVED PASSENGERS (frequent travellers)
  // ============================================================
  getSavedPassengers(userId: number): SavedPassenger[] {
    return getDatabase()
      .prepare('SELECT * FROM saved_passengers WHERE user_id = ? ORDER BY passenger_name')
      .all(userId) as unknown as SavedPassenger[];
  }

  addSavedPassenger(userId: number, data: {
    passenger_name: string;
    age: number;
    gender: string;
    berth_preference?: string;
  }): SavedPassenger {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO saved_passengers (user_id, passenger_name, age, gender, berth_preference)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, data.passenger_name, data.age, data.gender, data.berth_preference || 'ANY') as { lastInsertRowid: number };
    return db.prepare('SELECT * FROM saved_passengers WHERE id = ?').get(result.lastInsertRowid) as unknown as SavedPassenger;
  }

  deleteSavedPassenger(userId: number, passengerId: number): void {
    getDatabase().prepare('DELETE FROM saved_passengers WHERE id = ? AND user_id = ?').run(passengerId, userId);
  }

  // ============================================================
  // BOOKING OWNERSHIP
  // ============================================================
  linkBookingToUser(bookingId: number, userId: number): void {
    getDatabase().prepare('INSERT OR IGNORE INTO booking_ownership (booking_id, user_id) VALUES (?, ?)').run(bookingId, userId);
  }

  getUserBookingIds(userId: number): number[] {
    return (getDatabase()
      .prepare('SELECT booking_id FROM booking_ownership WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as unknown as { booking_id: number }[])
      .map(r => r.booking_id);
  }

  isBookingOwner(bookingId: number, userId: number): boolean {
    const record = getDatabase()
      .prepare('SELECT id FROM booking_ownership WHERE booking_id = ? AND user_id = ?')
      .get(bookingId, userId) as { id: number } | undefined;
    return !!record;
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  createNotification(data: {
    user_id: number;
    type: string;
    title: string;
    message: string;
    booking_id?: number;
  }): void {
    getDatabase().prepare(`
      INSERT INTO notifications (user_id, type, title, message, booking_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.user_id, data.type, data.title, data.message, data.booking_id ?? null);
  }

  getNotifications(userId: number, limit = 20): Notification[] {
    return getDatabase()
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(userId, limit) as unknown as Notification[];
  }

  markNotificationsRead(userId: number, notificationIds?: number[]): void {
    const db = getDatabase();
    if (notificationIds?.length) {
      const placeholders = notificationIds.map(() => '?').join(',');
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`)
        .run(userId, ...notificationIds);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    }
  }

  getUnreadCount(userId: number): number {
    return (getDatabase()
      .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0")
      .get(userId) as unknown as { c: number }).c;
  }

  // ============================================================
  // FINDERS
  // ============================================================
  findById(id: number): PassengerUser | undefined {
    return getDatabase().prepare('SELECT * FROM passenger_users WHERE id = ?').get(id) as unknown as PassengerUser | undefined;
  }

  findByEmail(email: string): PassengerUser | undefined {
    return getDatabase()
      .prepare('SELECT * FROM passenger_users WHERE email = ? COLLATE NOCASE')
      .get(email) as unknown as PassengerUser | undefined;
  }

  // Password reset token management
  createPasswordResetToken(userId: number): string {
    const db = getDatabase();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Invalidate old tokens
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);
    db.prepare('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(userId, tokenHash, expiresAt);

    return token; // Return the plaintext token (to be emailed, not stored)
  }

  async usePasswordResetToken(token: string, newPassword: string): Promise<boolean> {
    const db = getDatabase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = db.prepare(`
      SELECT prt.*, pu.id as user_id
      FROM password_reset_tokens prt
      JOIN passenger_users pu ON pu.id = prt.user_id
      WHERE prt.token_hash = ? AND prt.used = 0 AND prt.expires_at > datetime('now')
    `).get(tokenHash) as unknown as { user_id: number; id: number } | undefined;

    if (!record) return false;

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE passenger_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, record.user_id);
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);
      db.exec('COMMIT');
      return true;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

