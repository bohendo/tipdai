import { Module } from '@nestjs/common';
import { MessageService } from './message.service';

import { ChannelModule } from '../channel/channel.module';
import { ConfigModule } from '../config/config.module';
import { TwitterModule } from '../twitter/twitter.module';

@Module({
  providers: [MessageService],
  imports: [ConfigModule, ChannelModule, TwitterModule],
  exports: [MessageService],
})
export class MessageModule {}
