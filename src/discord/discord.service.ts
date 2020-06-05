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
      if (message.author.bot) return;
      this.log.info(`Recieved discord message: ${JSON.stringify(message, null, 2)}`);
      this.log.info(`Mentions: ${JSON.stringify(message.mentions, null, 2)}`);

      const mentions = message.mentions.users.map(user => user.id);
      const sender = await this.userRepo.getDiscordUser(message.author.id);

      // If this is a private 1-on-1 message
      if (message.guild === null) {
        const responses = await this.message.handlePrivateMessage(sender, message.cleanContent);
        const response = responses.reduce((acc, curr) => {
          return acc += `${acc}${curr}`;
        }, "");
        message.channel.send(response);

      // If this is a public message that only mentions TipDai & one other user
      } else if (
        !message.mentions.everyone &&
        mentions.includes(this.config.discordId) &&
        mentions.length === 2
      ) {
        const recipient = await this.userRepo.getDiscordUser(
          mentions.find(id => id !== this.config.discordId),
        );
        const response = await this.message.handlePublicMessage(
          sender,
          recipient,
          message.cleanContent,
        );
      }

    });

    this.discord.login(this.config.discordToken);
  }
}
