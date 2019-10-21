import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { MessageModule } from '../message/message.module';
import { TwitterModule } from '../twitter/twitter.module';
import { UserRepository } from '../user/user.repository';

import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    ConfigModule,
    MessageModule,
    TwitterModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
