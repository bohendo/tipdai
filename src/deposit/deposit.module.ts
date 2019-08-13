import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';

@Module({
  providers: [DepositService],
})
export class DepositModule {}
