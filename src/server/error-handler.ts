import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { dbAdapter } from './db';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code?: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = statusCode < 500;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid.', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Otentikasi diperlukan untuk mengakses sumber daya ini.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak: Anda tidak memiliki izin untuk tindakan ini.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data atau sumber daya yang diminta tidak ditemukan.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Konflik data terdeteksi.') {
    super(message, 409, 'CONFLICT');
  }
}

export interface ErrorLogRecord {
  id: string;
  errorId: string;
  businessId?: string;
  userId?: string;
  path: string;
  method: string;
  statusCode: number;
  errorName: string;
  message: string;
  sanitizedMessage: string;
  stackTrace?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// In-memory ring buffer of recent errors (max 50) for fast dashboard retrieval
const errorRingBuffer: ErrorLogRecord[] = [];

/**
 * Generates an Incident Error ID: ERR-YYYYMMDD-XXXX
 */
export function generateErrorId(): string {
  const dateStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const randHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ERR-${dateStr}-${randHex}`;
}

/**
 * Strips sensitive environment variables, secrets, DB paths, and passwords from error messages
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Kesalahan tidak diketahui.';
  return msg
    .replace(/(password|token|secret|key|pwd|authorization)=[^&\s]+/gi, '$1=***')
    .replace(/\/[a-zA-Z0-9_\-./]+\.db/gi, '[DB_FILE]')
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1***');
}

/**
 * Centralized Error Recorder:
 * Persists error to database and ring buffer without crashing
 */
export function recordError(err: any, req?: Request): ErrorLogRecord {
  const errorId = generateErrorId();
  const id = `err_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const timestamp = new Date().toISOString();
  const statusCode = Number(err.statusCode || err.status || 500);
  const errorName = String(err.name || 'Error');
  const rawMessage = String(err.message || 'Unknown error');
  const sanitizedMessage = sanitizeErrorMessage(rawMessage);
  const stackTrace = err.stack ? String(err.stack) : undefined;

  const path = req?.originalUrl || req?.url || 'INTERNAL';
  const method = req?.method || 'N/A';
  const businessId = req?.businessId || (req as any)?.auth?.businessId;
  const userId = (req as any)?.auth?.userId;
  const ipAddress = (req?.ip || '127.0.0.1').replace(/^::ffff:/, '').substring(0, 45);
  const userAgent = (req?.headers['user-agent'] || 'Unknown').substring(0, 200);

  const record: ErrorLogRecord = {
    id,
    errorId,
    businessId,
    userId,
    path,
    method,
    statusCode,
    errorName,
    message: rawMessage,
    sanitizedMessage,
    stackTrace,
    ipAddress,
    userAgent,
    timestamp,
  };

  // Add to ring buffer
  errorRingBuffer.unshift(record);
  if (errorRingBuffer.length > 50) {
    errorRingBuffer.pop();
  }

  // Persist to database error_logs table
  try {
    const errParams = [
      id,
      errorId,
      businessId || null,
      userId || null,
      path,
      method,
      statusCode,
      errorName,
      rawMessage,
      sanitizedMessage,
      stackTrace || null,
      ipAddress,
      userAgent,
      timestamp,
    ];

    dbAdapter.execute(`
      INSERT INTO error_logs (
        id, error_id, business_id, user_id, path, method, status_code,
        error_name, message, sanitized_message, stack_trace, ip_address, user_agent, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, errParams).catch((dbErr) => {
      console.error('[ErrorLogger] Failed to write to error_logs table:', dbErr.message);
    });
  } catch (dbErr) {
    console.error('[ErrorLogger] Failed to write to error_logs table:', dbErr);
  }

  // Safe console log with Incident ID
  console.error(`[INCIDENT ${errorId}] [${method} ${path}] ${errorName}: ${sanitizedMessage}`);

  return record;
}

/**
 * Express Centralized Error Handling Middleware
 * 1. Catches all errors from async/sync routes.
 * 2. Records error details securely.
 * 3. Never leaks stack traces or database internals to client responses.
 */
export function centralizedErrorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const record = recordError(err, req);
  const isOperational = err instanceof AppError ? err.isOperational : Boolean(err.isOperational || (err.statusCode && err.statusCode < 500));
  const statusCode = err.statusCode || 500;

  // Operational client errors (400, 401, 403, 404, 409)
  if (isOperational && statusCode < 500) {
    return res.status(statusCode).json({
      error: err.code || err.name || 'ClientError',
      message: err.message,
      details: err.details || undefined,
    });
  }

  // 500 Internal Server Errors - Strictly Sanitized!
  return res.status(500).json({
    error: 'InternalServerError',
    errorId: record.errorId,
    message: `Terjadi kendala internal pada server. Tim teknis kami telah mencatat masalah ini dengan kode insiden: ${record.errorId}. Silakan hubungi dukungan jika masalah berlanjut.`,
  });
}

/**
 * Retrieve recent errors for Super Admin / System Dashboard
 */
export function getRecentErrors(): ErrorLogRecord[] {
  return [...errorRingBuffer];
}
