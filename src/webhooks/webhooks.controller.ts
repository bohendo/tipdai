import * as crypto from 'crypto'
import { Controller, Get, Query } from '@nestjs/common';

import { ConfigService } from '../config/config.service';

type TwitterCRCResponse = {
  response_token: string;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly config: ConfigService) {}

  @Get('twitter')
  doTwitterCRC(@Query() query: any): TwitterCRCResponse {
    const hmac = crypto.createHmac('sha256', this.config.twitterHmac).update(query.crc_token);
    const response_token = `sha256=${hmac.digest('base64')}`
    console.log(`Got CRC, responding with: ${response_token}`)
    return ({ response_token })
  }

}
