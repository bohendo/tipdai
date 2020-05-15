import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ConfigModule } from "../config/config.module";
import { LoggerModule } from "../logger/logger.module";
import { UserRepository } from "../user/user.repository";
import { PaymentModule } from "../payment/payment.module";

import { TipRepository } from "./tip.repository";
import { TipService } from "./tip.service";

@Module({
  exports: [TipService],
  imports: [
    ConfigModule,
    LoggerModule,
    PaymentModule,
    TypeOrmModule.forFeature([UserRepository, TipRepository]),
  ],
  providers: [TipService],
})
export class TipModule {}
