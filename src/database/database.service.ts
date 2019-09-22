import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { ConfigService } from '../config/config.service';
import { Deposit } from '../deposit/deposit.entity';
import { InitDeposit1569186916275 } from '../migrations/1569186916275-InitDeposit';

const migrations = [InitDeposit1569186916275];
const entities = [Deposit];

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...this.config.database,
      entities,
      logging: ['error'],
      migrations,
      migrationsRun: true,
      synchronize: false,
      type: 'postgres',
    };
  }
}
