import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRepository } from '../user/user.repository';

import { TipRepository } from './tip.repository';
import { TipService } from './tip.service';

@Module({
  providers: [TipService],
  imports: [
    TypeOrmModule.forFeature([UserRepository, TipRepository]),
  ],
  exports: [TipService],
})
export class TipModule {}
