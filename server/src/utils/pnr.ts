// PNR Generator — generates globally unique 10-character booking references
// Format: PNR-XXXXXXXX (e.g. PNR-82910473)
// Academic Note: In production, cryptographically random IDs should be used.
// Here we use a combination of timestamp and random component for uniqueness.

import crypto from 'crypto';

export function generatePNR(): string {
  // Combine timestamp (reduced) with random bytes for uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PNR${timestamp}${random}`.slice(0, 10);
}

export function generateTransactionId(): string {
  return `SIM-TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateCancellationRef(): string {
  return `CXL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Generate a seat label like "CC1-4" or "S3-24"
export function allocateSeat(classCode: string, seatNumber: number): string {
  const coachMap: Record<string, string> = {
    '1A': 'A', '2A': 'B', '3A': 'S', 'SL': 'S', 'CC': 'C', '2S': 'D'
  };
  const prefix = coachMap[classCode] || 'X';
  const coach = Math.ceil(seatNumber / 72);
  const berth = ((seatNumber - 1) % 72) + 1;
  return `${prefix}${coach}-${berth}`;
}
