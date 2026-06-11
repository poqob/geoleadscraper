import * as path from 'node:path';
import * as dotenv from 'dotenv';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: path.resolve(__dirname, `../.env.${NODE_ENV}`) });
dotenv.config({ path: path.resolve(__dirname, `../.env`) });

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import rateLimit from '@fastify/rate-limit';
import {
  ValidationPipe,
  RequestMethod,
  Logger as NestLogger,
} from '@nestjs/common';

import { AppModule } from '@/modules/app';
import { HttpExceptionFilter, ServiceExceptionInterceptor } from '@/common';
import { Logger } from '@/modules/logger';

const PREFIX = 'v1';
const IS_PRODUCTION = NODE_ENV === 'production';

const logger = new Logger();

function parseOrigins(): boolean | string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw || raw === '*') return true; // allow any origin (self-hosted default)
  return raw.split(',').map((o) => o.trim());
}

async function bootstrap() {
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT) || 5050;

  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      {
        bufferLogs: true,
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        rawBody: true,
      },
    );

    NestLogger.overrideLogger(logger);

    /** Rate limiting — the extract endpoint is public on a self-hosted box. */
    await app.register(rateLimit, {
      max: Number(process.env.RATE_LIMIT_MAX) || 60,
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    });

    /** CORS — allow the extension (and anything else if ALLOWED_ORIGINS is *). */
    app.enableCors({
      origin: parseOrigins(),
      methods: ['GET', 'POST', 'OPTIONS'],
    });

    app.setGlobalPrefix(PREFIX, {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new HttpExceptionFilter(httpAdapterHost));
    app.useGlobalInterceptors(new ServiceExceptionInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        disableErrorMessages: IS_PRODUCTION,
      }),
    );

    await app.listen(port, host);
    logger.log(`🚀  Server listening on http://${host}:${port} (${NODE_ENV})`);
  } catch (err) {
    console.error('Startup error ➜', err);
    logger.error(
      '❌  App failed to start',
      err instanceof Error ? err.stack : err,
    );
    process.exit(1);
  }
}

bootstrap();

process.on('uncaughtException', (err) =>
  logger.error('uncaughtException', err),
);
process.on('unhandledRejection', (reason) =>
  logger.error('unhandledRejection', reason as any),
);
