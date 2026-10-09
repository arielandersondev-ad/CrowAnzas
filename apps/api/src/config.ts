import { DEFAULT_TIMEZONE, todayInTimezone } from '@crowanzas/contracts';

export const APP_CONFIG = Symbol('APP_CONFIG');
export interface AppConfig {
  port: number;
  webOrigin: string;
  timezone: string;
  storage: 'memory' | 'prisma';
  databaseUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawPort = env.API_PORT ?? '3001';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) < 1 || Number(rawPort) > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }
  const webOrigin = env.WEB_ORIGIN ?? 'http://localhost:3000';
  let origin: URL;
  try { origin = new URL(webOrigin); } catch { throw new Error('WEB_ORIGIN must be an HTTP(S) origin.'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== webOrigin) {
    throw new Error('WEB_ORIGIN must be an exact HTTP(S) origin without a path.');
  }
  const timezone = env.APP_TIMEZONE ?? DEFAULT_TIMEZONE;
  try { todayInTimezone(timezone); } catch { throw new Error('APP_TIMEZONE must be a valid IANA timezone.'); }
  const storage = env.API_STORAGE ?? 'memory';
  if (storage !== 'memory' && storage !== 'prisma') throw new Error('API_STORAGE must be memory or prisma.');
  const databaseUrl = env.DATABASE_URL;
  if (storage === 'prisma') {
    let parsed: URL;
    try { parsed = new URL(databaseUrl ?? ''); } catch { throw new Error('Prisma storage requires a valid DATABASE_URL.'); }
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) {
      throw new Error('DATABASE_URL must point to a PostgreSQL database.');
    }
  }
  return { port: Number(rawPort), webOrigin, timezone, storage, databaseUrl };
}
