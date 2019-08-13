import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';

import { ChannelModule } from '../channel/channel.module';
import { ConfigModule } from '../config/config.module';

@Module({
  providers: [DepositService],
  imports: [ConfigModule, ChannelModule],
})
export class DepositModule {}
