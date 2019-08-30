import { Body, Controller, Get, Query } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigService } from './config/config.service';
import { TwitterService } from './twitter/twitter.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
    private readonly twitter: TwitterService,
  ) {}

  @Get()
  async getHello(@Query() query: any, @Body() body: any): Promise<string> {
    console.log(`Body: ${JSON.stringify(body)}`);
    console.log(`Query: ${JSON.stringify(query)}`);
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
    return this.appService.getHello(this.twitter.authUrl);
  }
}
