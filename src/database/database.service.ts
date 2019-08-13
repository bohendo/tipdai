import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from "@nestjs/typeorm";

import { ConfigService } from "../config/config.service";

export const entities = [];
export const viewEntites = [];

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...this.config.database,
      entities: [...entities, ...viewEntites],
      logging: ["error"],
      synchronize: this.config.isDevMode,
      type: "postgres",
    };
  }
}

