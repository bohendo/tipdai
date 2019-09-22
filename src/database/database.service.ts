import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { ConfigService } from '../config/config.service';

import { Deposit } from '../deposit/deposit.entity';
import { ChannelRecord } from '../channel/channel.entity';

import { InitDeposit1569186916275 } from '../migrations/1569186916275-InitDeposit';
import { InitChannelRecords1569189365938 } from '../migrations/1569189365938-InitChannelRecords';

const migrations = [
  InitDeposit1569186916275,
  InitChannelRecords1569189365938,
];

const entities = [
  Deposit,
  ChannelRecord,
];

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
