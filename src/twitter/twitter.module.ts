import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "../config/config.module";
import { LoggerModule } from "../logger/logger.module";
import { MessageModule } from "../message/message.module";
import { UserRepository } from "../user/user.repository";

import { TwitterService } from "./twitter.service";

@Module({
  exports: [TwitterService],
  imports: [
    ConfigModule,
    LoggerModule,
    MessageModule,
    TypeOrmModule.forFeature([UserRepository]),
  ],
  providers: [TwitterService],
})
export class TwitterModule {}
