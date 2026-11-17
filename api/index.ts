/**
 * Vercel serverless entry point. Every request is rewritten here (see vercel.json)
 * and handled by the same Express app used locally by src/server.ts.
 *
 * The app and database connection live at module scope, so warm invocations
 * reuse them instead of reconnecting to MongoDB on every request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { connectDatabase } from '../src/db.js';

const config = loadConfig();
const app = createApp();

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    await connectDatabase(config.MONGODB_URI);
  } catch (error) {
    console.error('Database connection failed', error);
    response.statusCode = 503;
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The service is temporarily unavailable. Please try again shortly.',
        },
      }),
    );
    return;
  }
  // Express apps are plain (req, res) request listeners.
  app(request as Parameters<typeof app>[0], response as Parameters<typeof app>[1]);
}
