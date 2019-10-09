import { Injectable } from '@nestjs/common';
import { JsonRpcProvider } from 'ethers/providers';
import { Wallet } from 'ethers';
import * as fs from 'fs';

import { PostgresConfig, TwitterConfig } from '../types';

const env = {
  ethProvider: process.env.ETH_PROVIDER,
  linkBaseUrl: process.env.LINK_BASE_URL,
  mnemonicFile: process.env.MNEMONIC_FILE,
  nodeEnv: process.env.NODE_ENV,
  paymentHub: process.env.PAYMENT_HUB,
  pgDatabase: process.env.PGDATABASE,
  pgHost: process.env.PGHOST,
  pgPassFile: process.env.PGPASSFILE,
  pgPort: process.env.PGPORT,
  pgUser: process.env.PGUSR,
  twitterBotAccessSecret: process.env.TWITTER_BOT_ACCESS_SECRET,
  twitterBotAccessToken: process.env.TWITTER_BOT_ACCESS_TOKEN,
  twitterAppAccessSecret: process.env.TWITTER_APP_ACCESS_SECRET,
  twitterAppAccessToken: process.env.TWITTER_APP_ACCESS_TOKEN,
  twitterBotUserId: process.env.TWITTER_BOT_USER_ID,
  twitterCallbackUrl: process.env.TWITTER_CALLBACK_URL,
  twitterConsumerKey: process.env.TWITTER_CONSUMER_KEY,
  twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  twitterWebhookId: process.env.TWITTER_WEBHOOK_ID,
};

console.log(`Starting app in env: ${JSON.stringify(env, null, 2)}`);

const cfIndex = '25446';

@Injectable()
export class ConfigService {
  get ethProvider(): JsonRpcProvider {
    return new JsonRpcProvider(env.ethProvider);
  }

  public getWallet(index: number | string = cfIndex): Wallet {
    const mnemonic = fs.readFileSync(env.mnemonicFile, 'utf8');
    return Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).connect(this.ethProvider);
  }

  get linkBaseUrl(): string {
    return env.linkBaseUrl || 'https://rinkeby.indra.connext.network/redeem';
  }

  get wallet(): Wallet {
    return this.getWallet(0);
  }

  get isDevMode(): boolean {
    return env.nodeEnv === 'development';
  }

  get callbacks(): any {
    return {
      twitter: env.twitterCallbackUrl,
    };
  }

  get webhooks(): any {
    return {
      twitter: {
        env: 'prod',
        id: env.twitterWebhookId,
        url: `${env.twitterCallbackUrl}/webhooks/twitter`,
      },
    };
  }

  get twitterApp(): TwitterConfig {
    return {
      accessSecret: env.twitterAppAccessSecret,
      accessToken: env.twitterAppAccessToken,
      ...this.twitterDev,
    };
  }

  get twitterBot(): TwitterConfig {
    return {
      accessSecret: env.twitterBotAccessSecret,
      accessToken: env.twitterBotAccessToken,
      ...this.twitterDev,
    };
  }

  get twitterDev(): TwitterConfig {
    return {
      callbackUrl: env.twitterCallbackUrl,
      consumerKey: env.twitterConsumerKey,
      consumerSecret: env.twitterConsumerSecret,
      webhook: this.webhooks.twitter,
    };
  }

  get twitterBotUserId(): string {
    return env.twitterBotUserId;
  }

  get twitterHmac(): string {
    return env.twitterConsumerSecret;
  }

  get database(): PostgresConfig {
    return {
      database: env.pgDatabase,
      host: env.pgHost,
      password: fs.readFileSync(env.pgPassFile, 'utf8'),
      port: parseInt(env.pgPort, 10),
      username: env.pgUser,
    };
  }

  get channel(): any {
    return {
      ethProviderUrl: env.ethProvider,
      logLevel: 2,
      mnemonic: fs.readFileSync(env.mnemonicFile, 'utf8'),
      nodeUrl: env.paymentHub,
      type: 'postgres',
    };
  }
}
