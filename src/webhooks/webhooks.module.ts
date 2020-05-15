import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { LoggerModule } from '../logger/logger.module';
import { QueueModule } from '../queue/queue.module';
import { TwitterModule } from '../twitter/twitter.module';
import { UserRepository } from '../user/user.repository';

import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  imports: [
    ConfigModule,
    LoggerModule,
    QueueModule,
    TwitterModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
})
export class WebhooksModule {}
