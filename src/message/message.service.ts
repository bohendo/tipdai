import { Injectable } from '@nestjs/common';
import { formatEther, parseEther } from 'ethers/utils';

import { ChannelService } from '../channel/channel.service';
import { ConfigService } from '../config/config.service';
import { TwitterService } from '../twitter/twitter.service';

const botId = '1154313992141099008';

@Injectable()
export class MessageService {
  constructor(
    private readonly config: ConfigService,
    private readonly channel: ChannelService,
    private readonly twitter: TwitterService,
  ) {}

  public handleMessage = async (event) => {
    const sender = event.message_create.sender_id;
    const message = event.message_create.message_data.text;
    if (sender === botId) { return; } // ignore messages sent by the bot
    console.log(`Processing message event: ${JSON.stringify(event, null, 2)}`);

    if (message.match(/^crc/i)) {
      await this.twitter.triggerCRC();
      return;
    }

    const tokenAddress = ''; // await db.get('tokenAddress');
    const swapRate = '100'; // (await db.get(`swapRate`)) as any;
    console.log(`swap rate: ${swapRate}`);
    const maxDeposit = formatEther(
      parseEther(parseEther('10').toString()).div(parseEther(swapRate)),
    );
    console.log(`maxDeposit: ${maxDeposit}`);

    let user = '' as any; // ((await db.get(`user-${sender}`)) as any) as any;
    if (!user) {
      user = { hasBeenWelcomed: true };
      // await db.set(`user-${sender}`, JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }

    if (message.match(/^balance/i) || message.match(/^refresh/i)) {
      if (user.balance) {
        if (!user.linkPayment) {
          const channel = await this.channel.getChannel();
          console.log(`Attempting to create link payment`);
          const link = await channel.conditionalTransfer({
            amount: parseEther(user.balance),
            assetId: tokenAddress,
            conditionType: 'LINKED_TRANSFER',
          });
          console.log(`Link: ${JSON.stringify(link)}`);
          user.linkPayment = link;
          // await db.set(`user-${sender}`, JSON.stringify(user));
        } else {
          console.log(`Link: ${JSON.stringify(user.linkPayment)}`);
        }
        return await this.twitter.sendDM(
          sender,
          `Your balance is $${user.balance} (kovan) DAI.\n\nLink payment id: ${user.linkPayment.paymentId}\n\nSecret: ${user.linkPayment.preImage}`,
        );
      }
      return await this.twitter.sendDM(sender, `Your balance is $0.00`);
    }

    if (message.match(/^deposit/i)) {
      let pendingDeposits = '[]' as any; // (await db.get('pendingDeposits')) as any;
      let depositAddress;
      if (!pendingDeposits) {
        pendingDeposits = [];
        depositAddress = this.config.getWallet(1).address;
      } else {
        pendingDeposits = JSON.parse(pendingDeposits);
        const prevDeposit = pendingDeposits.filter(dep => dep.user === sender);
        if (prevDeposit[0]) {
          depositAddress = prevDeposit[0].address;
          pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender);
        } else {
          depositAddress = this.config.getWallet(pendingDeposits.length + 1).address;
        }
      }
      /*
      await db.set(
        'pendingDeposits',
        JSON.stringify([
          {
            address: depositAddress,
            oldBalance: formatEther(
              await this.config.provider.getBalance(depositAddress),
            ),
            startTime: Date.now(),
            user: sender,
          },
          ...pendingDeposits,
        ]),
      );
      */
      // TODO: mention max deposit
      await this.twitter.sendDM(
        sender,
        `Send max of ${maxDeposit} kovan ETH to the following address to deposit. This address will be available for deposits for 10 minutes. ` +
        `If you send a transaction with low gas, reply "wait" and the timeout will be extended.`,
      );
      await this.twitter.sendDM(sender, depositAddress);
      return;
    }

    if (message.match(/^wait/i)) {
      let pendingDeposits = '[]' as any; // (await db.get('pendingDeposits')) as any;
      if (!pendingDeposits) {
        return;
      } // No prevDeposit, ignore
      pendingDeposits = JSON.parse(pendingDeposits);
      const prevDeposit = pendingDeposits.filter(dep => dep.user === sender);
      if (!prevDeposit[0]) {
        return;
      } // No prevDeposit, ignore
      pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender);
      /*
      await db.set(
        'pendingDeposits',
        JSON.stringify([
          {
            startTime: Date.now(),
            ...prevDeposit,
          },
          ...pendingDeposits,
        ]),
      );
      */
      await this.twitter.sendDM(
        sender,
        `Timeout extended, you have 10 more minutes to deposit up to ${maxDeposit} kovan ETH to the below address. ` +
        `If you want to extend again, reply "wait" as many times as needed.`,
      );
      await this.twitter.sendDM(sender, prevDeposit[0].address);
      return;
    }

    if (message.match(/^tip/i)) {
      let tips = '[]' as any; // (await db.get(`unprocessedTips`)) as any;
      if (!tips) {
        tips = [];
      } else {
        tips = JSON.parse(tips);
      }
      console.log(`Processing tips: ${JSON.stringify(tips)}`);
      // await db.set('unprocessedTips', JSON.stringify(tips));
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
