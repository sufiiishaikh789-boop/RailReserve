// Special Ticket Controller — HTTP endpoints for Unreserved & Platform Tickets
// CSE 2271 | Presidency University, Bengaluru (Team 11)
// Academic Demonstration Only — No live IRCTC / railway system connection.

import type { Request, Response, NextFunction } from 'express';
import { SpecialTicketRepository } from '../repositories/SpecialTicketRepository.js';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { AppError } from '../middleware/index.js';

const specialRepo = new SpecialTicketRepository();
const trainRepo = new TrainRepository();

export class SpecialTicketController {

  // POST /api/unreserved/fare
  // Calculates unreserved general ticket fare between two stations
  calculateFare(req: Request, res: Response, next: NextFunction): void {
    try {
      const { source_code, dest_code, passenger_count = 1, train_type = 'ORDINARY' } = req.body as {
        source_code?: string;
        dest_code?: string;
        passenger_count?: number;
        train_type?: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST';
      };

      if (!source_code || !dest_code) {
        throw new AppError('source_code and dest_code are required', 400);
      }
      if (source_code.toUpperCase() === dest_code.toUpperCase()) {
        throw new AppError('Source and destination stations cannot be identical', 400);
      }

      const src = trainRepo.findStationByCode(source_code.toUpperCase());
      const dst = trainRepo.findStationByCode(dest_code.toUpperCase());
      if (!src) throw new AppError(`Station not found: ${source_code}`, 404);
      if (!dst) throw new AppError(`Station not found: ${dest_code}`, 404);

      const pax = Math.min(Math.max(1, Number(passenger_count) || 1), 6);
      const estimate = specialRepo.calculateUnreservedFare(src.id, dst.id, pax, train_type);

      res.json({
        success: true,
        source: { code: src.code, name: src.name, city: src.city },
        destination: { code: dst.code, name: dst.name, city: dst.city },
        ...estimate,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/unreserved/book
  // Issues an Unreserved Journey Ticket
  async bookUnreserved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        source_code,
        dest_code,
        journey_date,
        passenger_names,
        train_type = 'ORDINARY',
        contact_email,
        contact_phone,
      } = req.body as {
        source_code?: string;
        dest_code?: string;
        journey_date?: string;
        passenger_names?: string[];
        train_type?: 'ORDINARY' | 'MAIL_EXPRESS' | 'SUPERFAST';
        contact_email?: string;
        contact_phone?: string;
      };

      if (!source_code || !dest_code || !journey_date) {
        throw new AppError('source_code, dest_code, and journey_date are required', 400);
      }

      const src = trainRepo.findStationByCode(source_code.toUpperCase());
      const dst = trainRepo.findStationByCode(dest_code.toUpperCase());
      if (!src) throw new AppError(`Source station not found: ${source_code}`, 404);
      if (!dst) throw new AppError(`Destination station not found: ${dest_code}`, 404);
      if (src.id === dst.id) throw new AppError('Source and destination cannot be identical', 400);

      const names = Array.isArray(passenger_names) && passenger_names.length > 0
        ? passenger_names.map((n) => String(n).trim()).filter(Boolean)
        : ['General Passenger'];

      const paxCount = Math.min(names.length, 6);
      const userId = req.passengerUser?.id || null;

      const ticket = await specialRepo.createUnreservedTicket({
        user_id: userId,
        source_station_id: src.id,
        dest_station_id: dst.id,
        journey_date,
        passenger_count: paxCount,
        passenger_names: names.slice(0, paxCount),
        train_type,
        contact_email: contact_email || req.passengerUser?.email,
        contact_phone: contact_phone || undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Unreserved general ticket issued successfully (Demo).',
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/unreserved/:ticketNumber
  async getUnreservedTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketNumber = String(req.params.ticketNumber);
      if (!ticketNumber) throw new AppError('Ticket number is required', 400);

      const ticket = await specialRepo.getUnreservedTicketByNumber(ticketNumber.toUpperCase());
      if (!ticket) throw new AppError('Unreserved ticket not found', 404);

      res.json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/platform/book
  // Issues a Railway Platform Ticket (2h demo validity)
  async bookPlatform(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { station_code, ticket_count = 1, visitor_name, contact_phone } = req.body as {
        station_code?: string;
        ticket_count?: number;
        visitor_name?: string;
        contact_phone?: string;
      };

      if (!station_code || !visitor_name) {
        throw new AppError('station_code and visitor_name are required', 400);
      }

      const stn = trainRepo.findStationByCode(station_code.toUpperCase());
      if (!stn) throw new AppError(`Station not found: ${station_code}`, 404);

      const count = Math.min(Math.max(1, Number(ticket_count) || 1), 10);
      const userId = req.passengerUser?.id || null;

      const ticket = await specialRepo.createPlatformTicket({
        user_id: userId,
        station_id: stn.id,
        ticket_count: count,
        visitor_name: visitor_name.trim(),
        contact_phone: contact_phone || undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Platform entry ticket issued successfully (Valid for 2 hours, Demo).',
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/platform/:ticketNumber
  async getPlatformTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketNumber = String(req.params.ticketNumber);
      if (!ticketNumber) throw new AppError('Ticket number is required', 400);

      const ticket = await specialRepo.getPlatformTicketByNumber(ticketNumber.toUpperCase());
      if (!ticket) throw new AppError('Platform ticket not found', 404);

      res.json({ success: true, ticket });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/my-all-tickets
  // Returns consolidated Reserved, Unreserved, and Platform tickets for logged-in passenger
  getMyAllTickets(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!req.passengerUser) {
        throw new AppError('Authentication required', 401);
      }
      const special = specialRepo.getUserAllTickets(req.passengerUser.id);
      res.json({
        success: true,
        ...special,
      });
    } catch (err) {
      next(err);
    }
  }
}
