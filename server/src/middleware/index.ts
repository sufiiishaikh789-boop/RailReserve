// Express middleware — error handling, auth, and request validation
// Railway Reservation System v3.0 — Team 11, CSE 2271

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { ApiError } from '../types/index.js';

// ============================================================
// TYPE AUGMENTATION — extend Express Request with passenger user
// ============================================================
declare global {
  namespace Express {
    interface Request {
      passengerUser?: { id: number; email: string };
      adminUser?: { username: string; role: string };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'demo_railway_secret_change_in_production';

// ============================================================
// GLOBAL ERROR HANDLER (must have 4 params for Express to recognize it)
// ============================================================
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;

  const errorResponse: ApiError = {
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Error',
    message:
      statusCode === 500
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
  };

  res.status(statusCode).json(errorResponse);
}

// ============================================================
// 404 NOT FOUND HANDLER
// ============================================================
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `No route found for ${req.method} ${req.path}`,
  });
}

// ============================================================
// ADMIN AUTHENTICATION MIDDLEWARE (JWT Bearer token)
// ============================================================
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required. Include Authorization: Bearer <token> header.',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };

    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPERADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions for this operation',
      });
      return;
    }

    req.adminUser = {
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }
}

// ============================================================
// PASSENGER AUTHENTICATION MIDDLEWARE (JWT Bearer token)
// Requires a valid PASSENGER-role token; rejects with 401/403 otherwise.
// ============================================================
export function requirePassengerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Passenger authentication required. Include Authorization: Bearer <token> header.',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };

    if (decoded.role !== 'PASSENGER') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'This endpoint requires a passenger account token.',
      });
      return;
    }

    req.passengerUser = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired passenger token.',
    });
  }
}

// ============================================================
// OPTIONAL PASSENGER AUTH
// Attaches req.passengerUser if a valid PASSENGER token is present.
// Does NOT reject the request if the token is absent or invalid.
// Use for endpoints that behave differently for logged-in users.
// ============================================================
export function optionalPassengerAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(
        authHeader.substring(7),
        JWT_SECRET
      ) as { id: number; email: string; role: string };
      if (decoded.role === 'PASSENGER') {
        req.passengerUser = { id: decoded.id, email: decoded.email };
      }
    } catch {
      // Invalid token — treat as unauthenticated, continue silently
    }
  }
  next();
}

// ============================================================
// CUSTOM ERROR CLASS with HTTP STATUS CODE
// ============================================================
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}
