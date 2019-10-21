import * as crypto from 'crypto';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { MessageService } from '../message/message.service';
import { TwitterService } from '../twitter/twitter.service';

type TwitterCRCResponse = {
  response_token: string;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly config: ConfigService,
    private readonly message: MessageService,
    private readonly twitter: TwitterService,
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
    console.debug(`Got twitter events: ${JSON.stringify(keys)}`);

    if (body.tweet_create_events) {
      body.tweet_create_events.forEach(async tweet => {
        const response = await this.message.handlePublicMessage(tweet.user.id_str, tweet.text);
        if (response) {
          await this.twitter.tweet(
           `@${tweet.user.screen_name} ${response}`,
            tweet.id_str,
          );
        }
      });
    }

    if (body.direct_message_events) {
      body.direct_message_events.forEach(async dm => {
        const response = await this.message.handlePrivateMessage(
          dm.message_create.sender_id,
          dm.message_create.message_data.text,
          dm.message_create.message_data.entities.urls,
        );
        if (response) {
          await this.twitter.sendDM(dm.message_create.sender_id, response);
        }
      });
    }
  }

}
