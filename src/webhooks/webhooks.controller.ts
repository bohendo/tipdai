import * as crypto from 'crypto';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { MessageService } from '../message/message.service';

type TwitterCRCResponse = {
  response_token: string;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly config: ConfigService,
    private readonly message: MessageService,
  ) {}

  @Get('twitter')
  doTwitterCRC(@Query() query: any): TwitterCRCResponse {
    const hmac = crypto
      .createHmac('sha256', this.config.twitterHmac)
      .update(query.crc_token);
    const response_token = `sha256=${hmac.digest('base64')}`;
    console.log(`Got CRC, responding with: ${response_token}`);
    return { response_token };
  }

  @Post('twitter')
  async handleTwitterEvent(@Query() query: any, @Body() body: any): Promise<any> {
    const keys = Object.keys(body).filter(key => key !== 'for_user_id');
    console.log(`Got twitter events: ${JSON.stringify(keys)}`);
    if (body.tweet_create_events) {
      body.tweet_create_events.forEach(this.message.handleTweet);
    }
    if (body.direct_message_events) {
      body.direct_message_events.forEach(this.message.handleMessage);
    }
  }

}
