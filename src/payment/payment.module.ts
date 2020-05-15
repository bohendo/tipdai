import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { LoggerModule } from '../logger/logger.module';
import { ChannelModule } from '../channel/channel.module';
import { UserRepository } from '../user/user.repository';

import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';

@Module({
  exports: [PaymentService],
  imports: [
    ChannelModule,
    ConfigModule,
    LoggerModule,
    TypeOrmModule.forFeature([PaymentRepository, UserRepository]),
  ],
  providers: [PaymentService],
})
export class PaymentModule {}
