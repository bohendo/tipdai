import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';

@Module({
  providers: [ChannelService],
})
export class ChannelModule {}
