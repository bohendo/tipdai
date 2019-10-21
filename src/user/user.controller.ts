import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get('auth')
  doGetNonce(@Query() query: any): string | undefined {
    return this.userService.getNonce(query.address);
  }

  @Post('auth')
  doVerifySig(@Body() body: any): boolean {
    return this.userService.verifySig(body.address, body.token);
  }

}
