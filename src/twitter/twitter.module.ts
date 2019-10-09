import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { UserRepository } from '../user/user.repository';

import { TwitterService } from './twitter.service';

@Module({
  providers: [TwitterService],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  exports: [TwitterService],
})
export class TwitterModule {}
