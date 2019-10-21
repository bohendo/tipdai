import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChannelService } from './channel.service';
import { ChannelRecordRepository } from './channel.repository';

import { ConfigModule } from '../config/config.module';

@Module({
  exports: [ChannelService],
  imports: [ConfigModule, TypeOrmModule.forFeature([ChannelRecordRepository])],
  providers: [ChannelService],
})
export class ChannelModule {}
