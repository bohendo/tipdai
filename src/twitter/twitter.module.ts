import { Module } from '@nestjs/common';
import { TwitterService } from './twitter.service';

import { ConfigModule } from '../config/config.module';

@Module({
  providers: [TwitterService],
  imports: [ConfigModule],
})
export class TwitterModule {}
