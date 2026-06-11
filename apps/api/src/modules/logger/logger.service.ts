import { LoggerService } from '@nestjs/common';

import { pino, Logger as PinoLogger } from 'pino';

export class Logger implements LoggerService {
  logger: PinoLogger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production' || false;

    this.logger = isProduction
      ? pino()
      : pino({
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        });
  }

  log(message: any, ...params: any[]) {
    this.logger.info(message, ...params);
  }

  error(message: any, ...params: any[]) {
    this.logger.error(message, ...params);
  }

  warn(message: any, ...params: any[]) {
    this.logger.warn(message, ...params);
  }

  debug?(message: any, ...params: any[]) {
    this.logger.debug(message, ...params);
  }
}
