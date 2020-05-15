import { Body, Controller, Get, Post, Query } from "@nestjs/common";

import { User } from "./user.entity";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get("auth")
  doGetNonce(@Query() query: any): string | undefined {
    return this.userService.getNonce(query.address);
  }

  @Post("auth")
  async doVerifySig(@Body() body: any): Promise<boolean | User> {
    return await this.userService.verifySig(body.address, body.token);
  }

}
