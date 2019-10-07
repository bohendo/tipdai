import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentRepository } from './payment.repository';

@Module({
  providers: [],
  imports: [TypeOrmModule.forFeature([PaymentRepository])],
  exports: [PaymentRepository],
})
export class PaymentModule {}

