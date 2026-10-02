import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import app from './src/server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distPath, 'index.html');

  // Determine if server should run in production static serving mode vs dev mode
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.PROD) ||
    (process.env.DEV !== 'true' && fs.existsSync(distIndexHtml));

  if (isProduction) {
    if (fs.existsSync(distPath)) {
      console.log('[Server] Running in PRODUCTION mode - serving pre-built assets from /dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(distIndexHtml);
      });
    } else {
      console.warn('[Server] Warning: /dist not found. Please run `npm run build` before starting production server.');
    }
  } else {
    console.log('[Server] Running in DEVELOPMENT mode - initializing Vite dev server middleware');
    // Mount Vite dev server middleware only for local development
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Kalkulator HPP Fullstack SaaS running on port ${PORT} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
