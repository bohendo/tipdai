import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

import { ConfigModule } from '../config/config.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [ConfigModule, MessageModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
