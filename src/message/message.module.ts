import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageService } from './message.service';

import { ChannelModule } from '../channel/channel.module';
import { ConfigModule } from '../config/config.module';
import { TwitterModule } from '../twitter/twitter.module';
import { UserRepository } from '../user/user.repository';

@Module({
  providers: [MessageService],
  imports: [
    ConfigModule,
    ChannelModule,
    TwitterModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  exports: [MessageService],
})
export class MessageModule {}
