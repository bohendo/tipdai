import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { ConfigService } from '../config/config.service';

import { Deposit } from '../deposit/deposit.entity';
import { ChannelRecord } from '../channel/channel.entity';
import { User } from '../user/user.entity';
import { Payment } from '../payment/payment.entity';
import { Tip } from '../tip/tip.entity';

import { InitChannelRecords1569189365938 } from '../migrations/1569189365938-InitChannelRecords';
import { InitUser1569194238955 } from '../migrations/1569194238955-InitUser';
import { InitDeposit1569199329181 } from '../migrations/1569199329181-InitDeposit';
import { InitPayment1570607826598 } from '../migrations/1570607826598-InitPayment';
import { LinkUserPayment1570642369091 } from '../migrations/1570642369091-LinkUserPayment';
import { InitTip1570646855257 } from '../migrations/1570646855257-InitTip';
import { FixTip1570648530658 } from '../migrations/1570648530658-FixTip';
import { UpdateTip1570649406343 } from '../migrations/1570649406343-UpdateTip';
import { AddTwitterName1571652347467 } from '../migrations/1571652347467-AddTwitterName';

const migrations = [
  InitChannelRecords1569189365938,
  InitUser1569194238955,
  InitDeposit1569199329181,
  InitPayment1570607826598,
  LinkUserPayment1570642369091,
  InitTip1570646855257,
  FixTip1570648530658,
  UpdateTip1570649406343,
  AddTwitterName1571652347467,
];

const entities = [
  ChannelRecord,
  User,
  Deposit,
  Payment,
  Tip,
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
