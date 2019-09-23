import { Injectable } from '@nestjs/common';
import { formatEther, parseEther } from 'ethers/utils';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';
import { DepositService } from '../deposit/deposit.service';
import { TwitterService } from '../twitter/twitter.service';
import { User } from '../user/user.entity';
import { UserRepository } from '../user/user.repository';

const botId = '1154313992141099008';

@Injectable()
export class MessageService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly deposit: DepositService,
    private readonly twitter: TwitterService,
    private readonly userRepo: UserRepository,
  ) {
  }

  public handleMessage = async (event) => {
    const sender = event.message_create.sender_id;
    const message = event.message_create.message_data.text;
    if (sender === botId) { return; } // ignore messages sent by the bot
    console.log(`Processing message event: ${JSON.stringify(event, null, 2)}`);

    if (message.match(/^crc/i)) {
      try {
        await this.twitter.triggerCRC();
        return await this.twitter.sendDM(sender, 'Successfully triggered CRC!');
      } catch (e) {
        return await this.twitter.sendDM(sender, `CRC didn't go so well..`);
      }
    }

    let user = await this.userRepo.findByTwitterId(sender);
    if (!user) {
      user = new User();
      user.twitterId = sender;
      user.balance = '0.00';
      await this.userRepo.save(user);
      console.log(`Saved new user: ${JSON.stringify(user)}`);
    } else {
      console.log(`Found user: ${JSON.stringify(user)}`);
    }

    if (message.match(/^balance/i) || message.match(/^refresh/i)) {
      if (user.balance) {
        return await this.twitter.sendDM(
          sender,
          `Your balance is $${user.balance} (rinkeby) DAI.\n\nLink: ${user.linkPayment}`,
        );
      } else {
        return await this.twitter.sendDM(sender, `Your balance is $0.00`);
      }
    }

    if (message.match(/^deposit/i)) {
      const depositAddress = await this.deposit.newDeposit(user);
      await this.twitter.sendDM(
        sender,
        `Send up to 30 DAI worth of rinkeby ETH to the following address to deposit. ` +
        `This address will be available for deposits for 10 minutes. ` +
        `If you send a transaction with low gas, reply "wait" and the timeout will be extended.`,
      );
      await this.twitter.sendDM(sender, depositAddress);
      return;
    }

    if (message.match(/^wait/i)) {
      const depositAddress = await this.deposit.delayDeposit(user);
      if (!depositAddress) {
        await this.twitter.sendDM(
          sender,
          `No deposit found, reply with "deposit" to start a deposit.`,
        );
      }
      await this.twitter.sendDM(
        sender,
        `Timeout extended, you have 10 more minutes to deposit up to 30 DAI worth of rinkeby ETH to the below address. ` +
        `If you want to extend again, reply "wait" as many times as needed.`,
      );
      await this.twitter.sendDM(sender, depositAddress);
      return;
    }
  }

  public handleTweet = async (tweet) => {
    console.log(`Got a tweet event: ${JSON.stringify(tweet, null, 2)}`);
    const message = tweet.text;
    const fromUser = tweet.user.id_str;
    const mentionedUsers = tweet.entities.user_mentions.filter(
      ment => ment.id_str !== botId,
    );
    const amountMatch = message.match(/\$[0-9]\.?[0-9]*/);
    if (!mentionedUsers.length || !amountMatch) {
      // Improper tweet, ignore
      return;
    }
    const amount = amountMatch[0].replace('$', '');
    const toUser = mentionedUsers[0].id_str;
    let tips = '[]' as any; // (await db.get(`tipsArchive`)) as any;
    if (!tips) {
      tips = [];
    } else {
      tips = JSON.parse(tips);
    }
    tips.push({
      amount,
      fromUser,
      message,
      toUser,
      tweetId: tweet.id_str,
    });
    console.log(`Archived tips: ${JSON.stringify(tips, null, 2)}`);
    // db.set('tipsArchive', JSON.stringify(tips));

    let sender = '{}' as any; // (await db.get(`user-${fromUser}`)) as any;
    if (!sender) {
      sender = { id: sender };
    } else {
      sender = JSON.parse(sender);
    }

    if (!sender.balance || parseEther(sender.balance).lt(parseEther(amount))) {
      console.log(`sender balance ${sender.balance} is lower than ${amount}`);
      return; // TODO: this.twitter.tweet('hey sender you need more money')
    }

    let recipient = '{}' as any; // (await db.get(`user-${toUser}`)) as any;
    if (!recipient) {
      recipient = { id: toUser };
    } else {
      recipient = JSON.parse(recipient);
    }
    if (!recipient.balance) {
      recipient.balance = amount;
    } else {
      recipient.balance = formatEther(
        parseEther(recipient.balance).add(parseEther(amount)),
      );
    }
    console.log(`Recipient: ${JSON.stringify(recipient, null, 2)}`);
    // await db.set(`user-${toUser}`, JSON.stringify(recipient));

  }

}
