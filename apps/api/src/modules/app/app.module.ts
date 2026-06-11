import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { LoggerModule } from '@/modules/logger';
import { JobsModule } from '@/modules/jobs';

@Module({
  imports: [LoggerModule, JobsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
