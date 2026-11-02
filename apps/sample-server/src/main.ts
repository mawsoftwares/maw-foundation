import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Programmatically load .env file if it exists and we're not in production,
// since start script or deployed environments might not pass --env-file.
if (process.env.NODE_ENV !== 'production') {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch (e) {
      console.warn('Failed to programmatically load .env file:', e);
    }
  }
}

const { start } = await import('./start');

await start();
