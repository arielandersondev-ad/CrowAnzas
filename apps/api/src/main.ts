import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createApplication } from './bootstrap.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();
  const app = await createApplication(config);
  try { await app.listen(config.port); }
  catch (error) { await app.close(); throw error; }
  Logger.log(`Crowanzas API: http://localhost:${config.port}/api | storage=${config.storage} | timezone=${config.timezone}`);
  if (config.storage === 'memory') Logger.warn('DEMO memory storage: data is lost when the API restarts.');
}

main().catch((error: unknown) => {
  // Do not print connection strings or database errors containing credentials.
  Logger.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[DATABASE_URL]') : 'API startup failed');
  process.exitCode = 1;
});
