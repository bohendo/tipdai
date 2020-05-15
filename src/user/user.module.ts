import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "../config/config.module";
import { LoggerModule } from "../logger/logger.module";

import { UserController } from "./user.controller";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";

@Module({
  controllers: [UserController],
  exports: [UserService],
  imports: [
    ConfigModule,
    LoggerModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  providers: [UserService],
})
export class UserModule {}
