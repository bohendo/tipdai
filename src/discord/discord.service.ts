import { Injectable } from "@nestjs/common";
import { Client as Discord } from "discord.js";
import { OAuth } from "oauth";
import * as qs from "qs";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { tipRegex } from "../constants";
import { MessageService } from "../message/message.service";
import { UserRepository } from "../user/user.repository";
import { User } from "../user/user.entity";

@Injectable()
export class DiscordService {
  private inactive: boolean = false;
  private discord: Discord;

  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly userRepo: UserRepository,
    private readonly message: MessageService,
  ) {
    this.log.setContext("DiscordService");
    this.log.info(`Good morning!`);

    if (!this.config.discordToken) {
      this.log.warn(`No token provided, Discord stuff won't work.`);
      this.inactive = true;
      return;
    }

    this.discord = new Discord();

    this.discord.once("ready", () => {
      this.log.info("Successfully logged in. We're ready to go!");
    });

    this.discord.on("message", async (message) => {
      this.log.info(`Recieved discord message: ${JSON.stringify(message, null, 2)}`);
      this.log.info(`Mentions: ${JSON.stringify(message.mentions, null, 2)}`);
      // TODO: support discord users
      let sender = await this.userRepo.getTwitterUser(message.author.id);

      if (message.guild === null) {
        const responses = await this.message.handlePrivateMessage(sender, message.cleanContent);
        const response = responses.reduce((acc, curr) => {
          return acc += `${acc}${curr}`;
        }, "");
        message.channel.send(response);
      }

    });

    this.discord.login(this.config.discordToken);
  }
}
