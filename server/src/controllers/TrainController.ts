// Train Controller — HTTP layer for train search, station endpoints, and autocomplete
import type { Request, Response, NextFunction } from 'express';
import { TrainRepository } from '../repositories/TrainRepository.js';
import { validateSearchParams } from '../utils/validators.js';
import { AppError } from '../middleware/index.js';

const trainRepo = new TrainRepository();

export class TrainController {
  searchTrains(req: Request, res: Response, next: NextFunction): void {
    try {
      const { from, to, date, sort, filter_class, filter_avail } = req.query;
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

      // Filter by availability
      if (filter_avail === 'AVAILABLE') {
        results = results.filter(r => r.classes.some(c => c.available_seats > 0));
      } else if (filter_avail === 'WL') {
        results = results.filter(r => r.classes.some(c => c.available_seats === 0 && c.waiting_list_count < c.max_waiting_list));
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
      } else if (sort === 'arrival') {
        results.sort((a, b) => a.arrival_time.localeCompare(b.arrival_time));
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

  // Station autocomplete — returns matching stations for a search query
  autocompleteStations(req: Request, res: Response, next: NextFunction): void {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 1) {
        res.json({ success: true, stations: [] });
        return;
      }
      const stations = trainRepo.searchStations(q);
      res.json({ success: true, stations: stations.slice(0, 10) });
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

  // Get full intermediate stops for a train
  getTrainStops(req: Request, res: Response, next: NextFunction): void {
    try {
      const trainId = Number(req.params.trainId);
      if (!trainId || isNaN(trainId)) {
        throw new AppError('Invalid train ID', 400);
      }
      const stops = trainRepo.findTrainStops(trainId);
      res.json({ success: true, stops });
    } catch (err) {
      next(err);
    }
  }
}
