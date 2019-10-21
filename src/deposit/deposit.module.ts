import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChannelModule } from '../channel/channel.module';
import { ConfigModule } from '../config/config.module';

import { DepositRepository } from './deposit.repository';
import { DepositService } from './deposit.service';

import { UserRepository } from '../user/user.repository';

@Module({
  exports: [DepositService],
  imports: [
    ConfigModule,
    ChannelModule,
    TypeOrmModule.forFeature([DepositRepository, UserRepository]),
  ],
  providers: [DepositService],
})
export class DepositModule {}
