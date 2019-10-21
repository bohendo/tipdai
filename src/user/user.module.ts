import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { UserRepository } from '../user/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  exports: [UserService],
  providers: [UserService],
})
export class UserModule {}
