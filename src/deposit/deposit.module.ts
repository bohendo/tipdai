import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChannelModule } from '../channel/channel.module';
import { ConfigModule } from '../config/config.module';
import { PaymentModule } from '../payment/payment.module';

import { DepositRepository } from './deposit.repository';
import { DepositService } from './deposit.service';

import { UserRepository } from '../user/user.repository';

@Module({
  exports: [DepositService],
  imports: [
    ConfigModule,
    ChannelModule,
    PaymentModule,
    TypeOrmModule.forFeature([DepositRepository, UserRepository]),
  ],
  providers: [DepositService],
})
export class DepositModule {}
