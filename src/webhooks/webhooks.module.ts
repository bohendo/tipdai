import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
