import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { ConfigService } from '../config/config.service';

import { Deposit } from '../deposit/deposit.entity';
import { ChannelRecord } from '../channel/channel.entity';
import { User } from '../user/user.entity';
import { Payment } from '../payment/payment.entity';

import { InitChannelRecords1569189365938 } from '../migrations/1569189365938-InitChannelRecords';
import { InitUser1569194238955 } from '../migrations/1569194238955-InitUser';
import { InitDeposit1569199329181 } from '../migrations/1569199329181-InitDeposit';
import { InitPayments1570419214251 } from '../migrations/1570419214251-InitPayments';
import { LinkUserPayments1570440560857 } from '../migrations/1570440560857-LinkUserPayments';

const migrations = [
  InitChannelRecords1569189365938,
  InitUser1569194238955,
  InitDeposit1569199329181,
  InitPayments1570419214251,
  LinkUserPayments1570440560857,
];

const entities = [
  ChannelRecord,
  User,
  Deposit,
  Payment,
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
