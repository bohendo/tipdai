import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { ChannelModule } from '../channel/channel.module';
import { UserModule } from '../user/user.module';

import { PaymentRepository } from './payment.repository';

@Module({
  providers: [],
  imports: [
    ChannelModule,
    ConfigModule,
    UserModule,
    TypeOrmModule.forFeature([PaymentRepository]),
  ],
  exports: [PaymentRepository],
})
export class PaymentModule {}
