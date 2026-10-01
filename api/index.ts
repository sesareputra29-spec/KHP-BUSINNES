import app from '../src/server/app';

// Vercel Serverless Function entrypoint
// Exporting the Express app allows Vercel Node.js runtime to handle incoming serverless HTTP requests
export default app;
