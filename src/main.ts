import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

import { ConfigService } from "./config/config.service";
import { LoggerService } from "./logger/logger.service";

async function bootstrap() {
  const log = new LoggerService("Main");
  log.info(`Deploying TipDai`);
  const app = await NestFactory.create(AppModule, { logger: log });
  app.enableCors();
  const config = app.get(ConfigService);
  await app.listen(config.port);
}
bootstrap();
