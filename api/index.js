/**
 * Vercel serverless entry point. Every request is rewritten here (see vercel.json).
 *
 * It loads the API from dist/, which `npm run build` compiles from src/ during the
 * Vercel build, so Vercel only has to run plain JavaScript (no TypeScript compiling).
 * The app and database connection live at module scope, so warm invocations reuse
 * them instead of reconnecting to MongoDB on every request.
 */
import { createApp } from '../dist/app.js';
import { loadConfig } from '../dist/config/env.js';
import { connectDatabase } from '../dist/db.js';

const config = loadConfig();
const app = createApp();

/**
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 */
export default async function handler(request, response) {
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
  app(request, response);
}
