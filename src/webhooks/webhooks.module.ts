import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { QueueModule } from '../queue/queue.module';
import { TwitterModule } from '../twitter/twitter.module';
import { UserRepository } from '../user/user.repository';

import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  imports: [
    ConfigModule,
    QueueModule,
    TwitterModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
})
export class WebhooksModule {}
