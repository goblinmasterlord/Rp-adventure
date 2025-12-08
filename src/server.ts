/**
 * Infinite Adventure - Main Server Entry Point
 *
 * A procedural dark fantasy text adventure powered by Gemini AI
 * using the Vercel AI SDK.
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes } from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../static')));

// API routes
app.use('/api', routes);

// Serve main page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../templates/index.html'));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ▀█▀ █▄ █ █▀▀ ▀█▀ █▄ █ ▀█▀ ▀█▀ █▀▀                    ║
║      █  █ ▀█ █▀   █  █ ▀█  █   █  █▀▀                    ║
║                                                           ║
║     ▄▀█ █▀▄ █ █ █▀▀ █▄ █ ▀█▀ █ █ █▀█ █▀▀                 ║
║     █▀█ █▄▀ ▀▄▀ ██▄ █ ▀█  █  █▄█ █▀▄ ██▄                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

  Server running at http://localhost:${PORT}

  Using Vercel AI SDK with Gemini

  ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✓ API key configured' : '⚠ WARNING: GOOGLE_GENERATIVE_AI_API_KEY not set!'}
`);

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.log(`
  To configure:
  1. Get an API key from https://makersuite.google.com/app/apikey
  2. Create a .env file with: GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
`);
  }
});

export default app;
