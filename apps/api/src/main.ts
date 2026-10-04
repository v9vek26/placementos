import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import { runtimeConfig } from './runtime-config.js';
import { startupDiagnostic, type StartupStage } from './startup-diagnostics.js';

let startupStage: StartupStage = 'configuration';

async function bootstrap() {
  const config = runtimeConfig(process.env);
  startupStage = 'initialization';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    logger: false,
  });
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.enableShutdownHooks();

  app.enableCors({
    origin: config.origins,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  startupStage = 'listen';
  await app.listen(config.port, '0.0.0.0');
  app.useLogger(['log', 'error', 'warn']);
  console.info('API startup complete.');
}

bootstrap().catch((error: unknown) => {
  console.error(startupDiagnostic(error, startupStage));
  process.exitCode = 1;
});
