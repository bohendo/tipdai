import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

import { ConfigModule } from '../config/config.module';
import { MessageModule } from '../message/message.module';
import { TwitterModule } from '../twitter/twitter.module';

@Module({
  imports: [ConfigModule, MessageModule, TwitterModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
