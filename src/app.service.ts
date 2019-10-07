import { Injectable } from '@nestjs/common';

import { ConfigService } from './config/config.service';
import { TwitterService } from './twitter/twitter.service';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly twitter: TwitterService,
  ) {}

  async getHello(query: any): Promise<string> {
    // If we have an authUrl saved, then we have a 3-leg auth in-progress
    if (this.twitter.authUrl && query.oauth_token && query.oauth_verifier) {
      console.log(`Oauth response detected! Connecting new tip bot.`);
      await this.twitter.connectBot(
        this.config.twitterDev.consumerKey,
        query.oauth_token,
        query.oauth_verifier,
      );
      return 'Hello new tip bot minion!';
    }
    if (this.twitter.authUrl) {
      return `Hello World!<br/><a href="${this.twitter.authUrl}">Click to join the tip bot army</a>`;
    }
    return 'Hello World!';
  }

  async triggerCRC(): Promise<string> {
    console.log(`Triggering Twitter CRC`);
    try {
      await this.twitter.triggerCRC();
      console.log(`Success`);
      return 'success';
    } catch (e) {
      console.log(`Failure: ${e}`);
      return 'failure';
    }
  }
}
