import { Body, Controller, Get, Post } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { QueueService } from "../queue/queue.service";
import { UserRepository } from "../user/user.repository";
import { UserService } from "../user/user.service";
import { isValidHex } from "../utils";

import { LoggerService } from "../logger/logger.service";
import { MessageService } from "./message.service";

@Controller("message")
export class MessageController {
  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly messageService: MessageService,
    private readonly queueService: QueueService,
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
  ) {
    this.log.setContext("MessageController");
  }

  @Post("public")
  async doPublicMessage(@Body() body: any): Promise<string> {
    this.log.debug(`Got body: ${JSON.stringify(body)}`);
    const { address, message, recipientId, token } = body;
    if (!address || !message || !recipientId || !token) {
      return "Invalid Body, expected fields: address, message, recipientId, token";
    }
    if (!isValidHex(address, 20)) {
      return "Invalid Address, expected 20 byte hex";
    }
    if (!(await this.userService.verifySig(address, token))) {
      return "Invalid Token";
    }
    return await this.queueService.enqueue(
      async () => this.messageService.handlePublicMessage(
        await this.userRepo.getAddressUser(address),
        await this.userRepo.findOne({ id: recipientId }),
        message,
      ),
    );
  }

  @Post("private")
  async doPrivateMessage(@Body() body: any): Promise<string> {
    this.log.debug(`Got body: ${JSON.stringify(body)}`);
    const { address, message, token, urls } = body;
    if (!address || (!message && message !== "") || !token) {
      return "Invalid Body, expected fields: address, message, token";
    }
    if (!isValidHex(address, 20)) {
      return "Invalid Address, expected 20 byte hex";
    }
    if (!(await this.userService.verifySig(address, token))) {
      return "Invalid Token";
    }
    const response = await this.queueService.enqueue(
      async () => this.messageService.handlePrivateMessage(
        await this.userRepo.getAddressUser(address),
        message,
      ),
    );
    if (response) {
      return response.join("\n\n");
    }
    return "";
  }

}
