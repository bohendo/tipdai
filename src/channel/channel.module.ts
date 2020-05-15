import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChannelService } from './channel.service';
import { ChannelRecordRepository } from './channel.repository';

import { ConfigModule } from '../config/config.module';
import { LoggerModule } from "../logger/logger.module";

@Module({
  exports: [ChannelService],
  imports: [
    ConfigModule,
    LoggerModule,
    TypeOrmModule.forFeature([ChannelRecordRepository]),
  ],
  providers: [ChannelService],
})
export class ChannelModule {}
