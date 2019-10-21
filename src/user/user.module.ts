import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';

import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  exports: [UserService],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  providers: [UserService],
})
export class UserModule {}
