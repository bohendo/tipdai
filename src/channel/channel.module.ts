import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';

import { ConfigModule } from '../config/config.module';

@Module({
  providers: [ChannelService],
  imports: [ConfigModule],
  exports: [ChannelService],
})
export class ChannelModule {}
