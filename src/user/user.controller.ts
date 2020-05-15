import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { User } from './user.entity';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get('auth')
  doGetNonce(@Query() query: any): string | undefined {
    console.log(`Get /auth ? ${JSON.stringify(query)}`);
    return this.userService.getNonce(query.address);
  }

  @Post('auth')
  async doVerifySig(@Body() body: any): Promise<boolean | User> {
    console.log(`Post /auth ? ${JSON.stringify(body)}`);
    return await this.userService.verifySig(body.address, body.token);
  }

}
