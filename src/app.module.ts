import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChannelModule } from './channel/channel.module';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { DepositModule } from './deposit/deposit.module';
import { MessageModule } from './message/message.module';
import { QueueModule } from './queue/queue.module';
import { TipModule } from './tip/tip.module';
import { TwitterModule } from './twitter/twitter.module';
import { UserModule } from './user/user.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ChannelModule,
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    DepositModule,
    MessageModule,
    QueueModule,
    TipModule,
    TwitterModule,
    UserModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
