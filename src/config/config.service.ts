import { Injectable } from '@nestjs/common';
import { JsonRpcProvider } from 'ethers/providers';
import { Wallet } from 'ethers';
import * as fs from 'fs';

import { PostgresConfig, TwitterAppConfig, TwitterUserConfig } from '../types';

const env = {
  ethProvider: process.env.ETH_PROVIDER,
  mnemonicFile: process.env.MNEMONIC_FILE,
  nodeEnv: process.env.NODE_ENV,
  pgDatabase: process.env.PGDATABASE,
  pgHost: process.env.PGHOST,
  pgPassFile: process.env.PGPASSFILE,
  pgPort: process.env.PGPORT,
  pgUser: process.env.PGUSR,
  twitterBotAccessSecret: process.env.BOT_ACCESS_SECRET,
  twitterBotAccessToken: process.env.BOT_ACCESS_TOKEN,
  twitterCallbackUrl: process.env.CALLBACK_URL,
  twitterConsumerKey: process.env.CONSUMER_KEY,
  twitterConsumerSecret: process.env.CONSUMER_SECRET,
  twitterWebhookId: process.env.WEBHOOK_ID,
}

const cfIndex = "25446"

@Injectable()
export class ConfigService {

  get(key: string): string {
    return process.env[key];
  }

  getEthProvider(): JsonRpcProvider {
    return new JsonRpcProvider(env.ethProvider);
  }

  getWallet(index: number|string = cfIndex): Wallet {
    const mnemonic = fs.readFileSync(env.mnemonicFile, 'utf8')
    return Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).connect(this.getEthProvider());
  }

  get isDevMode(): boolean {
    return env.nodeEnv === "development"
  }

  get webhook(): any {
    return ({
      id: env.twitterWebhookId,
      url: `${env.twitterCallbackUrl}/webhooks/twitter`,
    })
  }

  get twitterDev(): TwitterAppConfig {
    return ({
      callbackUrl: env.twitterCallbackUrl,
      consumerKey: env.twitterConsumerKey,
      consumerSecret: env.twitterConsumerSecret,
    })
  }

  get twitterBot(): TwitterUserConfig {
    return ({
      accessSecret: env.twitterBotAccessSecret,
      accessToken: env.twitterBotAccessToken,
      ...this.twitterDev,
    })
  }

  get twitterHmac(): string {
    return env.twitterConsumerSecret;
  }

  get database(): PostgresConfig {
    return ({
      database: env.pgDatabase,
      host: env.pgHost,
      password: fs.readFileSync(env.pgPassFile, 'utf8'),
      port: parseInt(env.pgPort, 10),
      username: env.pgUser,
    })
  }

}
