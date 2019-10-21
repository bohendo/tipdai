import * as crypto from 'crypto';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { tipRegex } from '../constants';
import { MessageService } from '../message/message.service';
import { TwitterService } from '../twitter/twitter.service';
import { UserRepository } from '../user/user.repository';

type TwitterCRCResponse = {
  response_token: string;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly config: ConfigService,
    private readonly message: MessageService,
    private readonly twitter: TwitterService,
    private readonly userRepo: UserRepository,
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
        const sender = await this.userRepo.getTwitterUser(tweet.user.id_str, tweet.user.screen_name);
        const tipInfo = tweet.text.match(tipRegex);
        if (tipInfo && tipInfo[1]) {
          const recipientUser = tweet.extended_tweet.entities.user_mentions.find(
            user => user.screen_name === tipInfo[1],
          );
          const recipient = await this.userRepo.getTwitterUser(recipientUser.id_str, tipInfo[1]);
          const response = await this.message.handlePublicMessage(sender, recipient, tweet.text);
          if (response) {
            await this.twitter.tweet(
             `@${tweet.user.screen_name} ${response}`,
              tweet.id_str,
            );
          }
        } else {
          console.log(`Tweet isn't a well formatted tip, ignoring: ${tweet.text}`);
        }
      });
    }

    if (body.direct_message_events) {
      body.direct_message_events.forEach(async dm => {
        const senderId = dm.message_create.sender_id;
        let sender = await this.userRepo.getByTwitterId(senderId);
        if (!sender) {
          const twitterUser = await this.twitter.getUserById(senderId);
          console.log(`twitterUser: ${JSON.stringify(twitterUser)}`);
          sender = await this.userRepo.getTwitterUser(senderId, twitterUser.screen_name);
        }
        const responses = await this.message.handlePrivateMessage(
          sender,
          dm.message_create.message_data.text,
          dm.message_create.message_data.entities.urls.map(url => url.expanded_url),
        );
        if (responses && responses.length) {
          responses.forEach(
            async response => await this.twitter.sendDM(dm.message_create.sender_id, response),
          );
        }
      });
    }

  }
}
