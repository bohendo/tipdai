import { Body, Controller, Get, Post } from '@nestjs/common';

import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';

import { MessageService } from './message.service';

@Controller('message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
  ) {}

  @Post('public')
  async doPublicMessage(@Body() body: any): Promise<string> {
    const { address, message, recipientId, token } = body;
    if (!this.userService.verifySig(address, token)) {
      return 'Invalid Token';
    }
    const sender = await this.userRepo.getByAddress(address);
    const recipient = await this.userRepo.findOne({ id: recipientId });
    return this.messageService.handlePublicMessage(sender, recipient, message);
  }

  @Post('private')
  async doPrivateMessage(@Body() body: any): Promise<string> {
    const { address, message, token } = body;
    if (!this.userService.verifySig(address, token)) {
      return 'Invalid Token';
    }
    const sender = await this.userRepo.getByAddress(address);
    return (await this.messageService.handlePrivateMessage(sender, message, [])).join(' ');
  }

}
