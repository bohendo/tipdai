import { Injectable } from "@nestjs/common";

import { ConfigService } from "./config/config.service";
import { LoggerService } from "./logger/logger.service";
import { TwitterService } from "./twitter/twitter.service";

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly twitter: TwitterService,
  ) {
    this.log.setContext("AppService");
  }

  async getHello(query: any): Promise<string> {
    // If we have an authUrl saved, then we have a 3-leg auth in-progress
    if (this.twitter.authUrl && query.oauth_token && query.oauth_verifier) {
      this.log.info(`Oauth response detected! Connecting new tip bot.`);
      await this.twitter.connectBot(
        this.config.twitterDev.consumerKey,
        query.oauth_token,
        query.oauth_verifier,
      );
      return "Hello new tip bot minion!";
    }
    if (this.twitter.authUrl) {
      return `Hello World!<br/><a href="${this.twitter.authUrl}">Click to join the tip bot army</a>`;
    }
    return "Hello World!";
  }

  async triggerCRC(): Promise<string> {
    this.log.info(`Triggering Twitter CRC`);
    if (await this.twitter.triggerCRC()) {
      this.log.info(`Success`);
      return "success";
    } else {
      this.log.info(`CRC Failed`);
      return "failure";
    }
  }
}
