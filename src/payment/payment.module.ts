import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { ChannelModule } from '../channel/channel.module';
import { UserRepository } from '../user/user.repository';

import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';

@Module({
  providers: [PaymentService],
  imports: [
    ChannelModule,
    ConfigModule,
    TypeOrmModule.forFeature([PaymentRepository, UserRepository]),
  ],
  exports: [PaymentService],
})
export class PaymentModule {}