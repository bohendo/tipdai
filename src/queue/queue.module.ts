import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';

@Module({
  exports: [QueueService],
  providers: [QueueService],
})
export class QueueModule {}
