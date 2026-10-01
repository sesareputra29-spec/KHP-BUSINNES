import express, { Request, Response, NextFunction } from 'express';
import { initDatabase } from './db';
import { apiRouter } from './routes';

// Ensure database tables and initial seed data are initialized
initDatabase();

export const app = express();

// 1. Body parsers with generous limits for JSON exports/backups
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 2. CORS and Security Headers (Vercel & multi-origin preview compatible)
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 3. Request logger for API calls
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400 || req.method !== 'GET') {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 4. Serverless & Vercel Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const isVercel = Boolean(process.env.VERCEL);
  const hasPgUrl = Boolean(process.env.DATABASE_URL);

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    platform: isVercel ? 'Vercel Serverless (Node.js Functions)' : 'Node.js Standalone Server',
    database: hasPgUrl ? 'PostgreSQL (External Persistent DB)' : 'SQLite (Local / Serverless Ephemeral)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 5. Mount backend API routes under /api
app.use('/api', apiRouter);

// 6. Global API error handler (returns structured JSON instead of HTML stack traces)
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Terjadi kesalahan pada server.',
  });
});

export default app;
