// Train Controller — HTTP layer for train search and station endpoints
import type { Request, Response, NextFunction } from 'express';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { validateSearchParams } from '../utils/validators.js';
import { AppError } from '../middleware/index.js';

const trainRepo = new TrainRepository();

export class TrainController {
  searchTrains(req: Request, res: Response, next: NextFunction): void {
    try {
      const { from, to, date, sort, filter_class } = req.query;
      const errors = validateSearchParams({ from, to, date });

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid search parameters',
          details: errors,
        });
        return;
      }

      let results = trainRepo.findTrainsForRoute(
        String(from),
        String(to),
        String(date)
      );

      // Filter by class if requested
      if (filter_class && typeof filter_class === 'string') {
        results = results.map((r) => ({
          ...r,
          classes: r.classes.filter((c) => c.class_code === filter_class),
        })).filter((r) => r.classes.length > 0);
      }

      // Sort results
      if (sort === 'fare') {
        results.sort((a, b) => {
          const minFareA = Math.min(...a.classes.map((c) => c.total_fare));
          const minFareB = Math.min(...b.classes.map((c) => c.total_fare));
          return minFareA - minFareB;
        });
      } else if (sort === 'duration') {
        results.sort((a, b) => a.journey_duration_minutes - b.journey_duration_minutes);
      } else {
        // Default: sort by departure time
        results.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
      }

      res.json({
        success: true,
        count: results.length,
        trains: results,
      });
    } catch (err) {
      next(err);
    }
  }

  getStations(req: Request, res: Response, next: NextFunction): void {
    try {
      const stations = trainRepo.findAllStations();
      res.json({ success: true, stations });
    } catch (err) {
      next(err);
    }
  }

  getScheduleInfo(req: Request, res: Response, next: NextFunction): void {
    try {
      const scheduleId = Number(req.params.scheduleId);
      if (!scheduleId || isNaN(scheduleId)) {
        throw new AppError('Invalid schedule ID', 400);
      }
      const schedule = trainRepo.findScheduleById(scheduleId);
      if (!schedule) {
        throw new AppError('Schedule not found', 404);
      }
      res.json({ success: true, schedule });
    } catch (err) {
      next(err);
    }
  }
}
