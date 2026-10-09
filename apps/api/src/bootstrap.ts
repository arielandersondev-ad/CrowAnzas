import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadConfig, type AppConfig } from './config.js';

export async function createApplication(config: AppConfig = loadConfig(), logger: false | undefined = undefined) {
  const app = await NestFactory.create(AppModule.register(config), { logger, abortOnError: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.webOrigin, methods: ['GET', 'POST', 'OPTIONS'] });
  app.enableShutdownHooks();
  return app;
}
