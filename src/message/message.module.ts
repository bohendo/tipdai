import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { DepositModule } from '../deposit/deposit.module';
import { PaymentModule } from '../payment/payment.module';
import { QueueModule } from '../queue/queue.module';
import { TipModule } from '../tip/tip.module';
import { UserModule } from '../user/user.module';
import { UserRepository } from '../user/user.repository';

import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  controllers: [MessageController],
  exports: [MessageService],
  imports: [
    ConfigModule,
    DepositModule,
    PaymentModule,
    QueueModule,
    TipModule,
    TypeOrmModule.forFeature([UserRepository]),
    UserModule,
  ],
  providers: [MessageService],
})
export class MessageModule {}
