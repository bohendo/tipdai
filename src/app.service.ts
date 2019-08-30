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

    console.log(`Query: ${JSON.stringify(query)}`);
    console.log(`Twitter: ${typeof this.twitter}`);
    if (query.oauth_token && query.oauth_verifier) {
      console.log(`Oauth response detected`);
      const tokenRes = await this.twitter.getAccessToken(
        this.config.twitterDev.consumerKey,
        query.oauth_token,
        query.oauth_verifier,
      );
      console.log(`Got access token: ${JSON.stringify(tokenRes)}`);
      console.log(`(You should save this for later)`);
      await this.twitter.connectBot(
        tokenRes.oauth_token,
        tokenRes.oauth_token_secret,
      );
    }

    if (this.twitter.authUrl) {
      return `Hello World!<br/>Join the tip bot army: ${this.twitter.authUrl}`;
    }
    return 'Hello World!';
  }
}
