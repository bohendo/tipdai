import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/config.module';
import { LoggerModule } from '../logger/logger.module';

import { QueueService } from './queue.service';

@Module({
  exports: [QueueService],
  imports: [ConfigModule, LoggerModule],
  providers: [QueueService],
})
export class QueueModule {}
