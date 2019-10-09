import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRepository } from '../user/user.repository';

import { TipService } from './tip.service';

@Module({
  providers: [TipService],
  imports: [
    TypeOrmModule.forFeature([UserRepository]),
  ],
  exports: [TipService],
})
export class TipModule {}
