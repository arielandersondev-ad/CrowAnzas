import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Offline generate/validate need no URL. Migration commands require a real URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
