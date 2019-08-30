import { Body, Controller, Get, Query } from '@nestjs/common';

import { AppService } from './app.service';
import { TwitterService } from './twitter/twitter.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly twitter: TwitterService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('callback/twitter')
  handleTwitterAccessTokens(@Query() query: any, @Body() body: any): any {
    console.log(`Got call to callback/twitter`);
    console.log(`Body: ${JSON.stringify(body)}`);
    console.log(`Query: ${JSON.stringify(query)}`);
  }
}
